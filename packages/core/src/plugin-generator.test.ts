import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createConstructFromFiles,
  generateConstructFromGitHubFiles,
} from './plugin-generator.js';
import type { DotGithubContext } from './context.js';

// Mock dependencies
vi.mock('./git', () => ({
  cloneRepo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./github', () => ({
  getDefaultBranch: vi.fn().mockResolvedValue('main'),
}));

describe('Construct Generator', () => {
  let tempDir: string;
  let mockContext: DotGithubContext;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'construct-test-'));

    // Create mock context
    mockContext = {
      config: null as any,
      configPath: '',
      outputPath: '',
      relativePath: (p: string) => p,
      resolvePath: (p: string) => path.resolve(tempDir, p),
    } as unknown as DotGithubContext;
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('createConstructFromFiles', () => {
    it('should generate a construct with workflow and resource files', async () => {
      // Create test .github directory structure
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');

      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create test workflow file
      const testWorkflow = `name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: echo "Hello World"`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), testWorkflow);

      // Create test resource file
      const testResource = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"`;

      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), testResource);

      // Generate construct
      const result = await createConstructFromFiles({
        constructName: 'test-construct',
        githubFilesPath: githubDir,
        description: 'Test construct for function-based structure',
        context: mockContext,
      });

      // Verify construct content
      expect(result.filesFound).toHaveLength(2);
      expect(result.filesFound).toContain('workflows/ci.yml');
      expect(result.filesFound).toContain('resources/dependabot.yml');
      expect(result.generatedFiles).toHaveLength(2);

      // Check main construct content
      expect(result.constructContent).toContain('export class TestConstructConstruct');
      expect(result.constructContent).toContain('implements GitHubConstruct');
      expect(result.constructContent).toContain(
        'async applyWorkflows(context: ConstructContext)'
      );
      expect(result.constructContent).toContain(
        'async applyResources(context: ConstructContext)'
      );
      expect(result.constructContent).toContain(
        "import { ciHandler } from './workflows/ci';"
      );
      expect(result.constructContent).toContain(
        "import { dependabotHandler } from './resources/dependabot';"
      );

      // Check workflow file generation
      const workflowFile = result.generatedFiles.find(
        (f) => f.type === 'workflow'
      );
      expect(workflowFile).toBeDefined();
      expect(workflowFile?.name).toBe('ci');
      expect(workflowFile?.content).toContain(
        'export async function ciHandler(context: ConstructContext): Promise<void>'
      );
      expect(workflowFile?.content).toContain(
        "import { run } from '@dotgithub/core'"
      );
      expect(workflowFile?.content).toContain(
        "import type { ConstructContext } from '@dotgithub/core'"
      );

      // Check resource file generation
      const resourceFile = result.generatedFiles.find(
        (f) => f.type === 'resource'
      );
      expect(resourceFile).toBeDefined();
      expect(resourceFile?.name).toBe('dependabot');
      expect(resourceFile?.content).toContain(
        'export async function dependabotHandler(context: ConstructContext): Promise<void>'
      );
      expect(resourceFile?.content).toContain(
        "import type { ConstructContext } from '@dotgithub/core'"
      );

      // Check that construct calls functions with context
      expect(result.constructContent).toContain('ciHandler(context)');
      expect(result.constructContent).toContain('dependabotHandler(context)');
    });

    it('should handle constructs with only workflow files', async () => {
      // Create test .github directory with only workflows
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');

      fs.mkdirSync(workflowsDir, { recursive: true });

      const testWorkflow = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), testWorkflow);

      const result = await createConstructFromFiles({
        constructName: 'ci-only',
        githubFilesPath: githubDir,
        description: 'CI-only construct',
        context: mockContext,
      });

      expect(result.filesFound).toHaveLength(1);
      expect(result.filesFound).toContain('workflows/ci.yml');
      expect(result.generatedFiles).toHaveLength(1);

      expect(result.constructContent).toContain(
        'async applyWorkflows(context: ConstructContext)'
      );
      expect(result.constructContent).toContain(
        'async applyResources(_context: ConstructContext)'
      );
      expect(result.constructContent).toContain(
        "// This construct doesn't define any resources"
      );
    });

    it('should handle constructs with only resource files', async () => {
      // Create test .github directory with only resources
      const githubDir = path.join(tempDir, '.github');
      const resourcesDir = path.join(githubDir, 'resources');

      fs.mkdirSync(resourcesDir, { recursive: true });

      const testResource = `version: 2
updates:
  - package-ecosystem: "npm"`;

      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), testResource);

      const result = await createConstructFromFiles({
        constructName: 'resources-only',
        githubFilesPath: githubDir,
        description: 'Resources-only construct',
        context: mockContext,
      });

      expect(result.filesFound).toHaveLength(1);
      expect(result.filesFound).toContain('resources/dependabot.yml');
      expect(result.generatedFiles).toHaveLength(1);

      expect(result.constructContent).toContain(
        'async applyWorkflows(_context: ConstructContext)'
      );
      expect(result.constructContent).toContain(
        "// This construct doesn't define any workflows"
      );
      expect(result.constructContent).toContain(
        'async applyResources(context: ConstructContext)'
      );
    });

    it('should handle non-YAML resource files', async () => {
      // Create test .github directory with text files
      const githubDir = path.join(tempDir, '.github');

      fs.mkdirSync(githubDir, { recursive: true });

      const readmeContent = `# Project README
This is a test project.`;

      fs.writeFileSync(path.join(githubDir, 'README.md'), readmeContent);

      const result = await createConstructFromFiles({
        constructName: 'readme-plugin',
        githubFilesPath: githubDir,
        description: 'Construct with README',
        context: mockContext,
      });

      expect(result.filesFound).toHaveLength(1);
      expect(result.filesFound).toContain('README.md');
      expect(result.generatedFiles).toHaveLength(1);

      const resourceFile = result.generatedFiles.find(
        (f) => f.type === 'resource'
      );
      expect(resourceFile).toBeDefined();
      expect(resourceFile?.content).toContain(
        'export async function readmeHandler(context: ConstructContext): Promise<void>'
      );
      expect(resourceFile?.content).toContain(
        "'# Project README\\nThis is a test project.'"
      );
    });

    it('should validate construct name', async () => {
      const githubDir = path.join(tempDir, '.github');
      fs.mkdirSync(githubDir, { recursive: true });

      await expect(async () => {
        await createConstructFromFiles({
          constructName: '',
          githubFilesPath: githubDir,
          context: mockContext,
        });
      }).rejects.toThrow('Construct name is required and cannot be empty');

      await expect(async () => {
        await createConstructFromFiles({
          constructName: '   ',
          githubFilesPath: githubDir,
          context: mockContext,
        });
      }).rejects.toThrow('Construct name is required and cannot be empty');
    });

    it('should validate GitHub files path', async () => {
      await expect(async () => {
        await createConstructFromFiles({
          constructName: 'test',
          githubFilesPath: '',
          context: mockContext,
        });
      }).rejects.toThrow('GitHub files path is required and cannot be empty');

      await expect(async () => {
        await createConstructFromFiles({
          constructName: 'test',
          githubFilesPath: '/nonexistent/path',
          context: mockContext,
        });
      }).rejects.toThrow('Path does not exist: /nonexistent/path');
    });

    it('should handle empty directory', async () => {
      const githubDir = path.join(tempDir, '.github');
      fs.mkdirSync(githubDir, { recursive: true });

      await expect(async () => {
        await createConstructFromFiles({
          constructName: 'test',
          githubFilesPath: githubDir,
          context: mockContext,
        });
      }).rejects.toThrow('No files found in:');
    });

    it('should handle invalid YAML gracefully', async () => {
      // Create test .github directory with invalid YAML
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');

      fs.mkdirSync(workflowsDir, { recursive: true });

      const invalidYaml = `name: Test Workflow
on:
  push:
    branches: [main
jobs:
  test:
    runs-on: ubuntu-latest`;

      fs.writeFileSync(path.join(workflowsDir, 'invalid.yml'), invalidYaml);

      const result = await createConstructFromFiles({
        constructName: 'invalid-yaml',
        githubFilesPath: githubDir,
        description: 'Construct with invalid YAML',
        context: mockContext,
      });

      // Should still generate the construct, but with string content
      expect(result.filesFound).toHaveLength(1);
      expect(result.generatedFiles).toHaveLength(1);

      const workflowFile = result.generatedFiles.find(
        (f) => f.type === 'workflow'
      );
      expect(workflowFile).toBeDefined();
      expect(workflowFile?.content).toContain(
        'export async function invalidHandler(context: ConstructContext): Promise<void>'
      );
    });

    it('should extract actions from workflows when autoAddActions is enabled', async () => {
      // Create test .github directory with workflow containing actions
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');

      fs.mkdirSync(workflowsDir, { recursive: true });

      const testWorkflow = `name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'`;

      fs.writeFileSync(path.join(workflowsDir, 'test.yml'), testWorkflow);

      // Mock the autoAddActionsToConfig function to avoid actual API calls
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      const logSpy = vi.fn();
      const warnSpy = vi.fn();
      console.log = logSpy;
      console.warn = warnSpy;

      try {
        const result = await createConstructFromFiles({
          constructName: 'test-plugin',
          githubFilesPath: githubDir,
          context: mockContext,
          autoAddActions: true,
        });

        // Should generate the construct successfully
        expect(result.filesFound).toHaveLength(1);
        expect(result.generatedFiles).toHaveLength(1);

        // Should have logged about scanning for actions
        expect(logSpy).toHaveBeenCalledWith(
          '🔍 Scanning workflows for actions to auto-add...'
        );

        // Should have found actions (though they won't be added due to mocking)
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Found 2 unique actions to add: actions/checkout, actions/setup-node'
          )
        );
      } finally {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
      }
    });
  });

  describe('generateConstructFromGitHubFiles', () => {
    it('should generate construct from local path', async () => {
      // Create test .github directory structure
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');

      fs.mkdirSync(workflowsDir, { recursive: true });

      const testWorkflow = `name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), testWorkflow);

      const result = await generateConstructFromGitHubFiles({
        constructName: 'local-test',
        source: tempDir,
        description: 'Local test construct',
        context: mockContext,
      });

      expect(result.constructName).toBe('local-test');
      expect(result.filesFound).toHaveLength(1);
      expect(result.filesFound).toContain('workflows/ci.yml');
      expect(result.generatedFiles).toHaveLength(1);

      // Check that files were actually written
      expect(fs.existsSync(result.constructPath)).toBe(true);
      expect(
        fs.existsSync(
          path.join(path.dirname(result.constructPath), 'workflows', 'ci.ts')
        )
      ).toBe(true);
    });

    it('should handle overwrite option', async () => {
      // Create test .github directory
      const githubDir = path.join(tempDir, '.github');
      fs.mkdirSync(githubDir, { recursive: true });
      fs.writeFileSync(path.join(githubDir, 'test.yml'), 'test: content');

      // Generate construct first time
      const result1 = await generateConstructFromGitHubFiles({
        constructName: 'overwrite-test',
        source: tempDir,
        context: mockContext,
      });

      expect(fs.existsSync(result1.constructPath)).toBe(true);

      // Try to generate again without overwrite (should fail)
      await expect(
        generateConstructFromGitHubFiles({
          constructName: 'overwrite-test',
          source: tempDir,
          context: mockContext,
        })
      ).rejects.toThrow('Construct file already exists');

      // Generate with overwrite (should succeed)
      const result2 = await generateConstructFromGitHubFiles({
        constructName: 'overwrite-test',
        source: tempDir,
        overwrite: true,
        context: mockContext,
      });

      expect(fs.existsSync(result2.constructPath)).toBe(true);
    });
  });

  describe('Function-based structure validation', () => {
    it('should generate workflow functions with correct signature', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');

      fs.mkdirSync(workflowsDir, { recursive: true });

      const testWorkflow = `name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(
        path.join(workflowsDir, 'test-workflow.yml'),
        testWorkflow
      );

      const result = await createConstructFromFiles({
        constructName: 'function-test',
        githubFilesPath: githubDir,
        context: mockContext,
      });

      const workflowFile = result.generatedFiles.find(
        (f) => f.type === 'workflow'
      );
      expect(workflowFile).toBeDefined();

      const content = workflowFile!.content;

      // Check function signature
      expect(content).toContain('export async function testWorkflowHandler(');

      // Check stack usage
      expect(content).toContain('const { stack } = context;');
      expect(content).toContain('stack.addWorkflow(');
      expect(content).toContain("name: 'Test Workflow'");

      // Check imports
      expect(content).toContain("import { run } from '@dotgithub/core'");
      expect(content).toContain(
        "import type { ConstructContext } from '@dotgithub/core'"
      );
    });

    it('should generate resource functions with correct signature', async () => {
      const githubDir = path.join(tempDir, '.github');
      const resourcesDir = path.join(githubDir, 'resources');

      fs.mkdirSync(resourcesDir, { recursive: true });

      const testResource = `version: 2
updates:
  - package-ecosystem: "npm"`;

      fs.writeFileSync(
        path.join(resourcesDir, 'test-resource.yml'),
        testResource
      );

      const result = await createConstructFromFiles({
        constructName: 'resource-test',
        githubFilesPath: githubDir,
        context: mockContext,
      });

      const resourceFile = result.generatedFiles.find(
        (f) => f.type === 'resource'
      );
      expect(resourceFile).toBeDefined();

      const content = resourceFile!.content;

      // Check function signature
      expect(content).toContain('export async function testResourceHandler(');

      // Check stack usage
      expect(content).toContain('const { stack } = context;');
      expect(content).toContain('stack.addResource(');
      expect(content).toContain("'resources/test-resource.yml'");

      // Check imports
      expect(content).toContain(
        "import type { ConstructContext } from '@dotgithub/core'"
      );
    });

    it('should generate construct index that calls functions with context', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');

      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      fs.writeFileSync(
        path.join(workflowsDir, 'ci.yml'),
        'name: CI\non: [push]'
      );
      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), 'version: 2');

      const result = await createConstructFromFiles({
        constructName: 'context-test',
        githubFilesPath: githubDir,
        context: mockContext,
      });

      const content = result.constructContent;

      // Check imports
      expect(content).toContain("import { ciHandler } from './workflows/ci';");
      expect(content).toContain(
        "import { dependabotHandler } from './resources/dependabot';"
      );

      // Check function calls with context
      expect(content).toContain('await ciHandler(context);');
      expect(content).toContain('await dependabotHandler(context);');

      // Check that no inline definitions exist
      expect(content).not.toContain(
        'private readonly workflows: GitHubWorkflows = {'
      );
      expect(content).not.toContain(
        'private readonly files: Record<string, any> = {'
      );
    });
  });

  describe('Snapshot Tests', () => {
    it('should generate consistent construct structure with workflows and resources', async () => {
      // Create test .github directory structure
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');

      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create test workflow file
      const testWorkflow = `name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), testWorkflow);

      // Create test resource file
      const testResource = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "team-frontend"
    assignees:
      - "maintainer1"
    commit-message:
      prefix: "chore"
      include: "scope"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"`;

      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), testResource);

      // Create another resource file
      const codeownersContent = `# Global code owners
* @team-maintainers

# Frontend code
/frontend/ @team-frontend

# Backend code
/backend/ @team-backend

# Documentation
/docs/ @team-docs`;

      fs.writeFileSync(path.join(githubDir, 'CODEOWNERS'), codeownersContent);

      const result = await createConstructFromFiles({
        constructName: 'snapshot-test-plugin',
        githubFilesPath: githubDir,
        description: 'A comprehensive test construct for snapshot testing',
        context: mockContext,
      });

      // Test main construct content snapshot
      expect(result.constructContent).toMatchSnapshot('main-construct-content');

      // Test individual file contents
      const workflowFile = result.generatedFiles.find(
        (f) => f.type === 'workflow'
      );
      expect(workflowFile?.content).toMatchSnapshot('workflow-file-content');

      const dependabotResource = result.generatedFiles.find(
        (f) => f.name === 'dependabot'
      );
      expect(dependabotResource?.content).toMatchSnapshot(
        'dependabot-resource-content'
      );

      const codeownersResource = result.generatedFiles.find(
        (f) => f.name === 'codeowners'
      );
      expect(codeownersResource?.content).toMatchSnapshot(
        'codeowners-resource-content'
      );
    });

    it('should generate consistent construct structure with only workflows', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');

      fs.mkdirSync(workflowsDir, { recursive: true });

      const releaseWorkflow = `name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Run tests
        run: npm test
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}`;

      fs.writeFileSync(path.join(workflowsDir, 'release.yml'), releaseWorkflow);

      const result = await createConstructFromFiles({
        constructName: 'workflow-only-plugin',
        githubFilesPath: githubDir,
        description: 'Construct with only workflow files',
        context: mockContext,
      });

      expect(result.constructContent).toMatchSnapshot(
        'workflow-only-construct-content'
      );
      expect(result.generatedFiles[0]!.content).toMatchSnapshot(
        'release-workflow-content'
      );
    });

    it('should generate consistent construct structure with only resources', async () => {
      const githubDir = path.join(tempDir, '.github');

      fs.mkdirSync(githubDir, { recursive: true });

      const issueTemplate = `---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.`;

      fs.writeFileSync(
        path.join(githubDir, 'ISSUE_TEMPLATE.md'),
        issueTemplate
      );

      const result = await createConstructFromFiles({
        constructName: 'resource-only-plugin',
        githubFilesPath: githubDir,
        description: 'Construct with only resource files',
        context: mockContext,
      });

      expect(result.constructContent).toMatchSnapshot(
        'resource-only-construct-content'
      );
      expect(result.generatedFiles[0]!.content).toMatchSnapshot(
        'issue-template-content'
      );
    });

    it('should generate consistent construct with complex YAML resources', async () => {
      const githubDir = path.join(tempDir, '.github');

      fs.mkdirSync(githubDir, { recursive: true });

      const fundingYaml = `# These are supported funding model platforms

github: # Replace with up to 4 GitHub Sponsors-enabled usernames e.g., [user1, user2, 'user3', user4]
patreon: # Replace with a single Patreon username
open_collective: # Replace with a single Open Collective name
ko_fi: # Replace with a single Ko-fi username
tidelift: # Replace with a single Tidelift platform-name/package-name e.g., npm/babel
community_bridge: # Replace with a single Community Bridge project-name e.g., cloud-foundry
liberapay: # Replace with a single Liberapay username
issuehunt: # Replace with a single IssueHunt username
otechie: # Replace with a single Otechie username
custom: # Replace with up to 4 custom sponsorship URLs e.g., ['link1', 'link2', 'link3', 'link4']`;

      fs.writeFileSync(path.join(githubDir, 'FUNDING.yml'), fundingYaml);

      const result = await createConstructFromFiles({
        constructName: 'funding-plugin',
        githubFilesPath: githubDir,
        description: 'Construct with funding configuration',
        context: mockContext,
      });

      expect(result.constructContent).toMatchSnapshot('funding-construct-content');
      expect(result.generatedFiles[0]!.content).toMatchSnapshot(
        'funding-resource-content'
      );
    });

    it('should generate consistent construct with special characters in names', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');

      fs.mkdirSync(workflowsDir, { recursive: true });

      const specialWorkflow = `name: Test-Workflow_With.Special@Characters
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(
        path.join(workflowsDir, 'test-workflow_special.yml'),
        specialWorkflow
      );

      const result = await createConstructFromFiles({
        constructName: 'special-chars-plugin',
        githubFilesPath: githubDir,
        description: 'Construct with special characters in workflow names',
        context: mockContext,
      });

      expect(result.constructContent).toMatchSnapshot(
        'special-chars-construct-content'
      );
      expect(result.generatedFiles[0]!.content).toMatchSnapshot(
        'special-workflow-content'
      );
    });
  });

  describe('Index File Structure Validation (Snapshot Tests)', () => {
    it('should generate correct index file structure for complete construct', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');

      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create test files
      const ciWorkflow = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      const releaseWorkflow = `name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      const dependabotConfig = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"`;

      const codeownersContent = `* @team-maintainers
/frontend/ @team-frontend`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciWorkflow);
      fs.writeFileSync(path.join(workflowsDir, 'release.yml'), releaseWorkflow);
      fs.writeFileSync(
        path.join(resourcesDir, 'dependabot.yml'),
        dependabotConfig
      );
      fs.writeFileSync(path.join(githubDir, 'CODEOWNERS'), codeownersContent);

      const result = await createConstructFromFiles({
        constructName: 'complete-plugin-index-test',
        githubFilesPath: githubDir,
        description: 'Complete construct for index file snapshot testing',
        context: mockContext,
      });

      // Test the complete index file structure
      expect(result.constructContent).toMatchSnapshot(
        'complete-construct-index-file'
      );
    });

    it('should generate correct index file for workflow-only construct', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');

      fs.mkdirSync(workflowsDir, { recursive: true });

      const ciWorkflow = `name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      const releaseWorkflow = `name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciWorkflow);
      fs.writeFileSync(path.join(workflowsDir, 'release.yml'), releaseWorkflow);

      const result = await createConstructFromFiles({
        constructName: 'workflow-only-index-test',
        githubFilesPath: githubDir,
        description: 'Workflow-only construct for index file snapshot testing',
        context: mockContext,
      });

      // Test the workflow-only index file structure
      expect(result.constructContent).toMatchSnapshot('workflow-only-index-file');
    });

    it('should generate correct index file for resource-only construct', async () => {
      const githubDir = path.join(tempDir, '.github');

      fs.mkdirSync(githubDir, { recursive: true });

      const readmeContent = `# Test Project
This is a test project.`;

      const dependabotConfig = `version: 2
updates:
  - package-ecosystem: "npm"`;

      fs.writeFileSync(path.join(githubDir, 'README.md'), readmeContent);
      fs.writeFileSync(
        path.join(githubDir, 'dependabot.yml'),
        dependabotConfig
      );

      const result = await createConstructFromFiles({
        constructName: 'resource-only-index-test',
        githubFilesPath: githubDir,
        description: 'Resource-only construct for index file snapshot testing',
        context: mockContext,
      });

      // Test the resource-only index file structure
      expect(result.constructContent).toMatchSnapshot('resource-only-index-file');
    });

    it('should generate correct index file with special characters and complex naming', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');

      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create files with special characters to test naming
      const specialWorkflow = `name: Test-Workflow_With.Special@Characters
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      const specialResource = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"`;

      const anotherWorkflow = `name: Another_Complex-Workflow.Name
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest`;

      fs.writeFileSync(
        path.join(workflowsDir, 'test-workflow_special.yml'),
        specialWorkflow
      );
      fs.writeFileSync(
        path.join(workflowsDir, 'another-complex_workflow.yml'),
        anotherWorkflow
      );
      fs.writeFileSync(
        path.join(resourcesDir, 'special-config.yml'),
        specialResource
      );

      const result = await createConstructFromFiles({
        constructName: 'special-chars-index-test',
        githubFilesPath: githubDir,
        description:
          'Construct with special characters for index file snapshot testing',
        context: mockContext,
      });

      // Test the index file with special characters
      expect(result.constructContent).toMatchSnapshot('special-chars-index-file');
    });

    it('should generate correct index file with mixed file types', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');

      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create various file types
      const ciWorkflow = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest`;

      const issueTemplate = `---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
---

**Describe the bug**
A clear and concise description of what the bug is.`;

      const fundingYaml = `# These are supported funding model platforms
github: # Replace with up to 4 GitHub Sponsors-enabled usernames
patreon: # Replace with a single Patreon username
open_collective: # Replace with a single Open Collective name`;

      const codeownersContent = `# Global code owners
* @team-maintainers

# Frontend code
/frontend/ @team-frontend

# Backend code
/backend/ @team-backend`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciWorkflow);
      fs.writeFileSync(
        path.join(githubDir, 'ISSUE_TEMPLATE.md'),
        issueTemplate
      );
      fs.writeFileSync(path.join(githubDir, 'FUNDING.yml'), fundingYaml);
      fs.writeFileSync(path.join(githubDir, 'CODEOWNERS'), codeownersContent);

      const result = await createConstructFromFiles({
        constructName: 'mixed-files-index-test',
        githubFilesPath: githubDir,
        description:
          'Construct with mixed file types for index file snapshot testing',
        context: mockContext,
      });

      // Test the index file with mixed file types
      expect(result.constructContent).toMatchSnapshot('mixed-files-index-file');
    });

    it('should generate correct relative import paths for workflow files', async () => {
      const githubDir = path.join(__dirname, '../../../test-fixtures/.github');

      // Create a mock context with actions config
      const mockContext = {
        config: {
          version: '1.0.0',
          outputDir: 'src',
          actions: [
            {
              orgRepo: 'actions/checkout',
              ref: 'test-ref',
              versionRef: 'v4',
              functionName: 'checkout',
              outputPath: 'actions/actions/checkout.ts',
            },
            {
              orgRepo: 'actions/setup-node',
              ref: 'test-ref',
              versionRef: 'v4',
              functionName: 'setupNodeJsEnvironment',
              outputPath: 'actions/actions/setup-node.ts',
            },
          ],
          plugins: [],
          stacks: [],
          options: {
            tokenSource: 'env',
            formatting: { prettier: true },
          },
        },
        configPath: '',
        outputPath: '',
        relativePath: (p: string) => p,
        resolvePath: (p: string) => p,
      } as unknown as DotGithubContext;

      const result = await createConstructFromFiles({
        constructName: 'test-plugin',
        githubFilesPath: githubDir,
        context: mockContext,
        outputDir: 'src',
      });

      // Find the workflow file content (looking for test.ts since the fixture has test.yml)
      const workflowFile = result.generatedFiles.find((f) =>
        f.path.endsWith('workflows/test.ts')
      );
      expect(workflowFile).toBeDefined();
      expect(workflowFile!.content).toBeDefined();

      const workflowContent = workflowFile!.content!;

      // Verify that imports use the correct relative path (../../../)
      expect(workflowContent).toContain(
        "import { checkout } from '../../../actions/actions/checkout.js';"
      );
      expect(workflowContent).toContain(
        "import { setupNodeJsEnvironment } from '../../../actions/actions/setup-node.js';"
      );

      // Verify that the paths go up three levels to reach src/ from constructs/construct-name/workflows/
      expect(workflowContent).toMatch(
        /import.*from '\.\.\/\.\.\/\.\.\/actions\//
      );

      // Verify no incorrect paths (only two levels up)
      expect(workflowContent).not.toMatch(
        /import.*from '\.\.\/\.\.\/actions\//
      );
    });

    it('should use createStep for actions with generateCode: false', async () => {
      // Create a temporary test directory to avoid local config interference
      const testGithubDir = path.join(tempDir, '.github');
      const testWorkflowsDir = path.join(testGithubDir, 'workflows');
      fs.mkdirSync(testWorkflowsDir, { recursive: true });

      // Create a test workflow file
      const testWorkflowContent = `name: Test Workflow
on:
  push:
    branches: ['main']
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm test
        name: Run tests`;

      fs.writeFileSync(
        path.join(testWorkflowsDir, 'test.yml'),
        testWorkflowContent
      );

      // Create a mock context with actions config where generateCode is false
      const mockContext = {
        config: {
          version: '1.0.0',
          outputDir: 'src',
          actions: [
            {
              orgRepo: 'actions/checkout',
              ref: 'v4',
              versionRef: 'v4',
              functionName: 'checkout',
              outputPath: 'actions/actions/checkout.ts',
              generateCode: false,
            },
            {
              orgRepo: 'actions/setup-node',
              ref: 'v4',
              versionRef: 'v4',
              functionName: 'setupNodeJsEnvironment',
              outputPath: 'actions/actions/setup-node.ts',
              generateCode: true,
            },
          ],
          plugins: [],
          stacks: [],
          options: {
            tokenSource: 'env',
            formatting: { prettier: true },
          },
        },
        configPath: '',
        outputPath: '',
        relativePath: (p: string) => p,
        resolvePath: (p: string) => p,
      } as unknown as DotGithubContext;

      const result = await createConstructFromFiles({
        constructName: 'test-plugin',
        githubFilesPath: testGithubDir,
        context: mockContext,
        outputDir: 'src',
      });

      // Check the main construct file for imports - createStep should be imported
      expect(result.constructContent).toContain(
        "import { createStep, run } from '@dotgithub/core';"
      );

      // Find the workflow file content
      const workflowFile = result.generatedFiles.find((f) =>
        f.path.endsWith('workflows/test.ts')
      );
      expect(workflowFile).toBeDefined();
      expect(workflowFile!.content).toBeDefined();

      const workflowContent = workflowFile!.content!;

      // Verify that setupNodeJsEnvironment is imported (generateCode: true)
      expect(workflowContent).toContain(
        "import { setupNodeJsEnvironment } from '../../../actions/actions/setup-node.js';"
      );

      // Verify that checkout is NOT imported (generateCode: false)
      expect(workflowContent).not.toContain('import { checkout } from');

      // Verify that createStep is used for actions/checkout
      expect(workflowContent).toContain('createStep(');
      expect(workflowContent).toContain("uses: 'actions/checkout'");

      // Verify that setupNodeJsEnvironment function is used for actions/setup-node
      expect(workflowContent).toContain('setupNodeJsEnvironment(');
    });
  });
});
