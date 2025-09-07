import {
  GitHubStack,
  WorkflowConstruct,
  JobConstruct,
  IssueTemplateConstruct,
  PullRequestTemplateConstruct,
  CodeownersConstruct,
  DependabotConstruct,
  FileResourceConstruct
} from './index';
// TODO: Import checkout from generated files when available
// import { checkout } from '../../../cli/src/generated/checkout';


/**
 * Example: Complete GitHub repository configuration using constructs
 * This demonstrates how to use the construct system to build a full .github directory
 */
export function createExampleGitHubRepository(): GitHubStack {
  const stack = new GitHubStack();

  // === WORKFLOWS ===
  
  // CI Workflow for NPM Package
  const ci = new WorkflowConstruct(stack, 'ci', {
    name: 'CI - Build & Test NPM Package',
    on: {
      push: { branches: ['main', 'develop'] },
      pull_request: {}
    },
    permissions: {
      contents: 'read',
      checks: 'write'
    }
  });

  // Test Job - Multi-platform testing
  const testJob = new JobConstruct(ci, 'test', {
    name: 'Test on ${{ matrix.os }} - Node ${{ matrix.node-version }}',
    runsOn: '${{ matrix.os }}',
    strategy: {
      matrix: {
        'os': ['ubuntu-latest', 'windows-latest', 'macos-latest'],
        'node-version': ['18', '20', '22']
      },
      failFast: false
    }
  });

  testJob
    .addCheckoutStep()
    .addSetupNodeStep({ 
      'node-version': '${{ matrix.node-version }}',
      cache: 'npm' 
    })
    .addRunStep('npm ci', { name: 'Install dependencies' })
    .addRunStep('npm run lint', { name: 'Lint code' })
    .addRunStep('npm run type-check', { name: 'TypeScript type checking' })
    .addRunStep('npm test -- --coverage', { name: 'Run tests with coverage' })
    .addRunStep('npm run build', { name: 'Build package' })
    .addRunStep('npm run test:integration', { 
      name: 'Integration tests',
      if: 'matrix.os == \'ubuntu-latest\' && matrix.node-version == \'20\''
    });
  
    

  // Upload coverage only from ubuntu-latest with Node 20
  testJob.addActionStep('codecov/codecov-action', {
    token: '${{ secrets.CODECOV_TOKEN }}',
    file: './coverage/lcov.info'
  }, {
    name: 'Upload coverage to Codecov',
    if: 'matrix.os == \'ubuntu-latest\' && matrix.node-version == \'20\''
  });

  // Build Artifacts Job
  const buildJob = new JobConstruct(ci, 'build-artifacts', {
    name: 'Build NPM Package Artifacts',
    runsOn: 'ubuntu-latest',
    needs: 'test'
  });

  buildJob
    .addCheckoutStep()
    .addSetupNodeStep({ 'node-version': '20', cache: 'npm' })
    .addRunStep('npm ci', { name: 'Install dependencies' })
    .addRunStep('npm run build', { name: 'Build package' })
    .addRunStep('npm pack', { name: 'Create NPM package tarball' })
    .addActionStep('actions/upload-artifact', {
      name: 'npm-package',
      path: '*.tgz'
    }, { name: 'Upload package artifact' });

  // Test Package Installation
  const packageTestJob = new JobConstruct(ci, 'test-package', {
    name: 'Test Package Installation',
    runsOn: 'ubuntu-latest',
    needs: 'build-artifacts'
  });

  packageTestJob
    .addCheckoutStep()
    .addSetupNodeStep({ 'node-version': '20' })
    .addActionStep('actions/download-artifact', {
      name: 'npm-package',
      path: './dist'
    }, { name: 'Download package artifact' })
    .addRunStep('cd test-install && npm init -y', { name: 'Create test package' })
    .addRunStep('cd test-install && npm install ../dist/*.tgz', { name: 'Install from tarball' })
    .addRunStep('cd test-install && node -e "console.log(require(\'./package.json\').name + \' installed successfully\')"', { 
      name: 'Verify installation' 
    });

  // Bundle Size Check
  const bundleSizeJob = new JobConstruct(ci, 'bundle-size', {
    name: 'Bundle Size Analysis',
    runsOn: 'ubuntu-latest',
    if: 'github.event_name == \'pull_request\''
  });

  bundleSizeJob
    .addCheckoutStep({ 'fetch-depth': 0 })
    .addSetupNodeStep({ 'node-version': '20', cache: 'npm' })
    .addRunStep('npm ci')
    .addRunStep('npm run build')
    .addActionStep('preactjs/compressed-size-action', {
      'repo-token': '${{ secrets.GITHUB_TOKEN }}',
      'build-script': 'build',
      pattern: './dist/**/*.{js,css}'
    }, { name: 'Check bundle size' });

  // Release Workflow for NPM Package
  const release = new WorkflowConstruct(stack, 'release', {
    name: 'Release NPM Package',
    on: {
      push: { branches: ['main'] },
      workflow_dispatch: {}
    },
    permissions: {
      contents: 'write',
      packages: 'write',
      'id-token': 'write'
    }
  });

  const releaseJob = new JobConstruct(release, 'release', {
    name: 'Build & Publish NPM Package',
    runsOn: 'ubuntu-latest',
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
  });

  releaseJob
    .addCheckoutStep({ 'fetch-depth': 0 })
    .addSetupNodeStep({ 
      'node-version': '20', 
      cache: 'npm'
    })
    .addRunStep('npm ci', { name: 'Install dependencies' })
    .addRunStep('npm run lint', { name: 'Lint code' })
    .addRunStep('npm test', { name: 'Run tests' })
    .addRunStep('npm run build', { name: 'Build package' })
    .addRunStep('npm run docs:generate', { 
      name: 'Generate documentation',
      'continue-on-error': true 
    });

  // Dry run publish to validate package
  releaseJob.addRunStep('npm publish --dry-run', { 
    name: 'Validate package before publish' 
  });

  // Use semantic-release for automated versioning and publishing
  releaseJob.addActionStep('semantic-release/semantic-release', {}, {
    name: 'Semantic Release',
    env: {
      GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
      NPM_TOKEN: '${{ secrets.NPM_TOKEN }}'
    }
  });

  // Alternative: Manual publish step (commented out in favor of semantic-release)
  // releaseJob.addRunStep('npm publish', {
  //   name: 'Publish to NPM',
  //   env: { NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}' }
  // });

  // Create GitHub Release
  releaseJob.addActionStep('actions/create-release', {
    tag_name: '${{ steps.semantic.outputs.new_release_version }}',
    release_name: 'Release ${{ steps.semantic.outputs.new_release_version }}',
    body: '${{ steps.semantic.outputs.new_release_notes }}',
    draft: false,
    prerelease: false
  }, {
    name: 'Create GitHub Release',
    if: 'steps.semantic.outputs.new_release_published == \'true\'',
    env: { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }
  });

  // Security Workflow
  const security = new WorkflowConstruct(stack, 'security', {
    name: 'Security',
    on: {
      push: { branches: ['main'] },
      pull_request: {},
      schedule: [{ cron: '0 0 * * 1' }] // Weekly on Mondays
    }
  });

  const codeqlJob = new JobConstruct(security, 'codeql', {
    name: 'CodeQL Analysis',
    runsOn: 'ubuntu-latest',
    permissions: {
      actions: 'read',
      contents: 'read',
      'security-events': 'write'
    }
  });

  codeqlJob
    .addCheckoutStep()
    .addActionStep('github/codeql-action/init', {
      languages: 'typescript'
    })
    .addActionStep('github/codeql-action/autobuild', {})
    .addActionStep('github/codeql-action/analyze', {});

  // === ISSUE TEMPLATES ===

  new IssueTemplateConstruct(stack, 'bug_report', {
    name: 'Bug Report',
    about: 'Create a report to help us improve',
    title: '[Bug]: ',
    labels: ['bug', 'triage'],
    body: [
      {
        type: 'markdown',
        attributes: {
          value: 'Thanks for taking the time to fill out this bug report!'
        }
      },
      {
        type: 'textarea',
        id: 'description',
        attributes: {
          label: 'Describe the bug',
          description: 'A clear and concise description of what the bug is.',
          placeholder: 'Tell us what you see!'
        },
        validations: { required: true }
      },
      {
        type: 'textarea',
        id: 'reproduction',
        attributes: {
          label: 'Steps to reproduce',
          description: 'How do you trigger this bug? Please walk us through it step by step.',
          value: `1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error`,
          render: 'bash'
        },
        validations: { required: true }
      },
      {
        type: 'textarea',
        id: 'expected',
        attributes: {
          label: 'Expected behavior',
          description: 'A clear and concise description of what you expected to happen.'
        }
      },
      {
        type: 'dropdown',
        id: 'version',
        attributes: {
          label: 'Version',
          description: 'What version of our software are you running?',
          options: ['1.0.0', '1.1.0', '2.0.0', 'main branch']
        },
        validations: { required: true }
      }
    ]
  });

  new IssueTemplateConstruct(stack, 'feature_request', {
    name: 'Feature Request',
    about: 'Suggest an idea for this project',
    title: '[Feature]: ',
    labels: ['enhancement'],
    body: [
      {
        type: 'textarea',
        id: 'problem',
        attributes: {
          label: 'Is your feature request related to a problem?',
          description: 'A clear and concise description of what the problem is.',
          placeholder: 'Ex. I\'m always frustrated when [...]'
        }
      },
      {
        type: 'textarea',
        id: 'solution',
        attributes: {
          label: 'Describe the solution you\'d like',
          description: 'A clear and concise description of what you want to happen.'
        },
        validations: { required: true }
      }
    ]
  });

  // === PULL REQUEST TEMPLATE ===

  new PullRequestTemplateConstruct(stack, `## Description

Brief description of the changes in this PR.

## Type of Change

Please delete options that are not relevant.

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)  
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes.

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes`);

  // === CODEOWNERS ===

  new CodeownersConstruct(stack, {
    // Global owners
    '*': ['@owner', '@maintainer'],
    
    // Documentation
    '*.md': ['@docs-team'],
    'docs/': ['@docs-team'],
    
    // Frontend code
    'src/components/': ['@frontend-team'],
    '*.tsx': ['@frontend-team'],
    '*.css': ['@frontend-team'],
    
    // Backend code  
    'src/api/': ['@backend-team'],
    'src/database/': ['@backend-team'],
    
    // Infrastructure
    '.github/workflows/': ['@devops-team'],
    'Dockerfile': ['@devops-team'],
    'docker-compose.yml': ['@devops-team'],
    
    // Security
    'SECURITY.md': ['@security-team'],
    '.github/workflows/security.yml': ['@security-team']
  });

  // === DEPENDABOT ===

  new DependabotConstruct(stack, {
    version: 2,
    updates: [
      {
        'package-ecosystem': 'npm',
        directory: '/',
        schedule: { interval: 'weekly' },
        'open-pull-requests-limit': 10,
        'target-branch': 'develop',
        reviewers: ['@maintainer'],
        assignees: ['@maintainer'],
        labels: ['dependencies']
      },
      {
        'package-ecosystem': 'github-actions',
        directory: '/',
        schedule: { interval: 'weekly' },
        'open-pull-requests-limit': 5,
        reviewers: ['@devops-team']
      }
    ]
  });

  // === ADDITIONAL RESOURCES ===

  // Security Policy
  new FileResourceConstruct(stack, 'SECURITY.md', `# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities to security@example.com.
We will respond within 48 hours.

## Security Best Practices

- Keep dependencies up to date
- Use npm audit to check for vulnerabilities
- Report issues through GitHub Security Advisories`);

  // Funding Configuration
  new FileResourceConstruct(stack, 'FUNDING.yml', `github: [owner, maintainer]
ko_fi: owner
patreon: owner
open_collective: project-name
custom: ["https://paypal.me/owner", "https://buy-me-a-coffee.com/owner"]`);

  // Contributing Guidelines
  new FileResourceConstruct(stack, 'CONTRIBUTING.md', `# Contributing to Our NPM Package

Thank you for your interest in contributing! This document outlines the process and guidelines.

## Development Setup

\`\`\`bash
# Fork and clone the repo
git clone https://github.com/yourusername/project-name.git
cd project-name

# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build
\`\`\`

## Development Process

1. **Fork the repository** and create a feature branch
2. **Make your changes** following our coding standards
3. **Add/update tests** for any new functionality
4. **Run the full test suite** to ensure nothing breaks
5. **Update documentation** if needed
6. **Submit a pull request** with a clear description

## Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Run \`npm run lint\` before submitting
- Use meaningful commit messages

## Testing

- Write unit tests for new functions
- Update integration tests for API changes
- Ensure all tests pass: \`npm test\`
- Check test coverage: \`npm run test:coverage\`

## Releasing

Releases are automated using semantic-release. Use conventional commit messages:
- \`feat:\` for new features
- \`fix:\` for bug fixes  
- \`docs:\` for documentation changes
- \`refactor:\` for code refactoring`);

  // NPM Package specific files
  new FileResourceConstruct(stack, '.npmignore', `# Source files
src/
*.ts
!*.d.ts

# Test files
test/
tests/
*.test.*
*.spec.*

# Development files
.eslintrc.*
.prettierrc.*
tsconfig.json
jest.config.*
vitest.config.*

# Documentation
docs/
*.md
!README.md

# CI/CD
.github/
.travis.yml
.circleci/

# IDE
.vscode/
.idea/

# Logs
*.log
logs/

# Coverage
coverage/
.nyc_output/

# Build artifacts
.tsbuildinfo`);

  // Package documentation
  new FileResourceConstruct(stack, 'README.md', `# NPM Package Template

[![npm version](https://badge.fury.io/js/package-name.svg)](https://badge.fury.io/js/package-name)
[![CI](https://github.com/owner/package-name/workflows/CI/badge.svg)](https://github.com/owner/package-name/actions)
[![codecov](https://codecov.io/gh/owner/package-name/branch/main/graph/badge.svg)](https://codecov.io/gh/owner/package-name)

A well-structured NPM package with comprehensive CI/CD and quality tools.

## Installation

\`\`\`bash
npm install package-name
\`\`\`

## Usage

\`\`\`typescript
import { someFunction } from 'package-name';

const result = someFunction('input');
console.log(result);
\`\`\`

## API Reference

### \`someFunction(input: string): string\`

Description of what the function does.

**Parameters:**
- \`input\` (string): Description of the input parameter

**Returns:**
- (string): Description of the return value

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT © [Owner Name](https://github.com/owner)`);

  // Code of Conduct
  new FileResourceConstruct(stack, 'CODE_OF_CONDUCT.md', `# Code of Conduct

## Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone.

## Our Standards

Examples of behavior that contributes to creating a positive environment:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

## Enforcement

Instances of abusive behavior may be reported to the project maintainers.
All complaints will be reviewed and investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org).`);

  // Changelog template
  new FileResourceConstruct(stack, 'CHANGELOG.md', `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial package structure
- CI/CD workflows
- Comprehensive testing setup

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release`);

  // GitHub repository settings via probot-settings
  new FileResourceConstruct(stack, 'settings.yml', `# Repository settings managed by probot-settings
repository:
  name: package-name
  description: A well-structured NPM package with comprehensive tooling
  homepage: https://owner.github.io/package-name
  topics: 
    - npm
    - typescript
    - javascript
    - package
  private: false
  has_issues: true
  has_projects: false
  has_wiki: false
  default_branch: main
  allow_squash_merge: true
  allow_merge_commit: false
  allow_rebase_merge: true
  delete_branch_on_merge: true

# Branch protection rules
branches:
  - name: main
    protection:
      required_status_checks:
        strict: true
        contexts:
          - "test (ubuntu-latest, 20)"
          - "build-artifacts"
      enforce_admins: false
      required_pull_request_reviews:
        required_approving_review_count: 1
        dismiss_stale_reviews: true
        require_code_owner_reviews: true
      restrictions: null

# Labels for issues and PRs
labels:
  - name: bug
    color: d73a4a
    description: Something isn't working
  - name: enhancement
    color: a2eeef
    description: New feature or request
  - name: documentation
    color: 0075ca
    description: Improvements to documentation
  - name: dependencies
    color: 0366d6
    description: Updates to dependencies
  - name: good first issue
    color: 7057ff
    description: Good for newcomers
  - name: help wanted
    color: 008672
    description: Extra attention is needed`);

  // Semantic release configuration
  new FileResourceConstruct(stack, '.releaserc.yml', `branches:
  - main
  - name: beta
    prerelease: true
plugins:
  - "@semantic-release/commit-analyzer"
  - "@semantic-release/release-notes-generator"
  - "@semantic-release/changelog"
  - "@semantic-release/npm"
  - "@semantic-release/github"
  - - "@semantic-release/git"
    - assets:
        - CHANGELOG.md
        - package.json
        - package-lock.json
      message: "chore(release): \${nextRelease.version} [skip ci]\\n\\n\${nextRelease.notes}"`);

  // NPM-specific issue templates
  new IssueTemplateConstruct(stack, 'npm_package_issue', {
    name: 'NPM Package Issue',
    about: 'Report an issue with package installation or usage',
    title: '[NPM]: ',
    labels: ['bug', 'npm'],
    body: [
      {
        type: 'input',
        id: 'package-version',
        attributes: {
          label: 'Package Version',
          description: 'Which version of the package are you using?',
          placeholder: 'e.g., 1.2.3'
        },
        validations: { required: true }
      },
      {
        type: 'input',
        id: 'node-version',
        attributes: {
          label: 'Node.js Version',
          description: 'Which version of Node.js are you using?',
          placeholder: 'e.g., 18.17.0'
        },
        validations: { required: true }
      },
      {
        type: 'input',
        id: 'npm-version',
        attributes: {
          label: 'NPM Version',
          description: 'Which version of NPM are you using?',
          placeholder: 'e.g., 9.6.7'
        },
        validations: { required: true }
      },
      {
        type: 'dropdown',
        id: 'install-method',
        attributes: {
          label: 'Installation Method',
          options: ['npm install', 'yarn add', 'pnpm add', 'other']
        },
        validations: { required: true }
      },
      {
        type: 'textarea',
        id: 'error-output',
        attributes: {
          label: 'Error Output',
          description: 'Please paste any error messages or logs',
          render: 'shell'
        }
      }
    ]
  });

  return stack;
}

/**
 * Example usage demonstration
 */
export function runExample(): void {
  console.log('Creating example GitHub repository structure...\n');
  
  const stack = createExampleGitHubRepository();
  
  // Generate all files
  const files = stack.synth();
  
  console.log('Generated files:');
  Object.keys(files).forEach(filename => {
    console.log(`  .github/${filename}`);
  });
  
  console.log(`\nTotal files: ${Object.keys(files).length}`);
  
  // Show example file content
  console.log('\n--- Example: CI Workflow ---');
  console.log(files['workflows/ci.yml']);
  
  console.log('\n--- Example: Bug Report Template ---');
  console.log(files['ISSUE_TEMPLATE/bug_report.yml']);
  
  // Get complete DotGitHub structure
  const dotGithub = stack.getDotGitHub();
  console.log('\n--- DotGitHub Structure ---');
  console.log('Workflows:', Object.keys(dotGithub.workflows));
  console.log('Resources:', Object.keys(stack.resources));
}

// Uncomment to run the example
// runExample();