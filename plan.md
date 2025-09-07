# GitHub Workflows & .github Files Framework Plan

## Overview
Extend the existing @dotgithub monorepo to create a comprehensive framework for writing GitHub workflows and .github files using TypeScript. Enable creating NPM packages that contain complete .github configurations for specific purposes.

## Current State
- **@dotgithub/core**: Generates TypeScript types from GitHub Action YAML files
- **@dotgithub/cli**: CLI with `add` command for generating individual action types
- Strong type system for GitHub workflows and actions
- Integration with GitHub API and git cloning

## Framework Extensions

### 1. Template System Architecture
**Templates as Complete .github Bundles:**
- Multiple workflows (CI, deploy, release, etc.)
- GitHub configuration files (dependabot.yml, CODEOWNERS, issue templates, etc.)
- Template metadata with variables and configuration options
- Documentation and usage instructions

**Template Package Structure:**
```
@dotgithub/template-node-app/
├── package.json              # NPM package metadata
├── template.json            # Template configuration & variables
├── workflows/               # TypeScript workflow files
│   ├── ci.yml.ts
│   ├── deploy.yml.ts
│   └── release.yml.ts
├── github-files/           # Static GitHub files
│   ├── dependabot.yml
│   ├── CODEOWNERS
│   ├── FUNDING.yml
│   └── issue_template.md
└── README.md              # Template documentation
```

### 2. Core Library Extensions (@dotgithub/core)
- **Workflow YAML Generation**: Convert TypeScript workflows to YAML
- **GitHub Files Generator**: Generate all .github configuration files
- **Template Processing Engine**: Variable substitution and file processing
- **Multi-Template Support**: Handle multiple template application for monorepos
- **Template Validation System**: Ensure templates are valid and complete

### 3. Enhanced CLI Commands (@dotgithub/cli)

**Primary Commands:**
- `dotgithub generate <template1> <template2> [...templateN]` - Generate complete .github setup from templates
- `dotgithub template create <name>` - Create custom templates from existing setups
- `dotgithub template list` - Browse available templates (local/remote)
- `dotgithub template validate <path>` - Validate template structure

**Multi-Template Support:**
```bash
# Monorepo example
dotgithub generate monorepo-base node-lib python-service docker-deploy

# With per-template configuration
dotgithub generate node-app --config node.json python-lib --config python.json
```

**Template Creation:**
```bash
# From existing .github directory
dotgithub template create my-company-standard --from-github .github --package

# Interactive wizard
dotgithub template create my-template --interactive --package

# From single workflow
dotgithub template create deploy-template --from-workflow .github/workflows/deploy.yml
```

### 4. NPM Package Integration
**Standard NPM Publishing:**
- Templates are regular NPM packages with "dotgithub-template" keyword
- Use standard `npm publish` workflow (no custom publish command needed)
- Template discovery through NPM registry search
- Version management through NPM semver

**Package Discovery:**
```bash
# Search NPM registry for templates
dotgithub template search react

# Auto-install on first use
dotgithub generate @dotgithub/template-node-app
```

### 5. Template Configuration System

**template.json Format:**
```json
{
  "name": "node-app",
  "description": "Complete Node.js application setup",
  "category": "web-app",
  "variables": {
    "appName": {
      "type": "string", 
      "description": "Application name",
      "required": true
    },
    "nodeVersion": {
      "type": "string",
      "default": "18",
      "description": "Node.js version"
    },
    "deployTarget": {
      "type": "choice",
      "options": ["vercel", "netlify", "aws"],
      "description": "Deployment target"
    }
  },
  "files": {
    "workflows": ["ci.yml.ts", "deploy.yml.ts"],
    "github": ["dependabot.yml", "CODEOWNERS"]
  }
}
```

**Multi-Template Configuration:**
```yaml
# .dotgithub.yml
templates:
  - name: monorepo-base
    variables:
      repoName: "my-monorepo"
  
  - name: node-lib  
    variables:
      packagePath: "packages/frontend"
      nodeVersion: "18"
    scope:
      workflows: ["ci", "test"]
      
  - name: python-service
    variables: 
      servicePath: "packages/api"
      pythonVersion: "3.11"

mergeStrategy: "combine"
```

### 6. Template Merge Strategies
- **Combine**: Include all workflows and files from all templates
- **Override**: Later templates override earlier ones
- **Namespace**: Prefix workflows by template name
- **Interactive**: Prompt for conflict resolution

## Implementation Phases

### Phase 1: Core Template Engine
- Extend @dotgithub/core with workflow YAML generation
- Implement template loading and variable substitution
- Add GitHub files generation capabilities
- Create template validation system

### Phase 2: CLI Template Commands
- Implement `dotgithub generate` command
- Add `dotgithub template create` with variable extraction
- Implement template discovery and NPM integration
- Add multi-template support

### Phase 3: First Template Packages
- Create `@dotgithub/template-node-app`
- Create `@dotgithub/template-python-lib`
- Validate complete workflow from template creation to usage
- Refine template structure based on real usage

### Phase 4: Advanced Features
- Template dependency system
- Conflict resolution strategies
- Template update mechanisms
- Community template ecosystem

## Benefits
- **Type Safety**: All workflows written in TypeScript with full type checking
- **Reusability**: Share complete .github configurations as NPM packages
- **Consistency**: Standardized GitHub setups across projects
- **Monorepo Support**: Apply multiple templates for complex repository structures
- **Maintainability**: Easy updates through package versioning
- **Ecosystem**: Community-driven template marketplace

## Success Metrics
- Teams can generate complete .github setups with single command
- Template packages can be easily created from existing configurations
- Monorepo projects can compose multiple templates seamlessly
- Community adoption of template sharing through NPM packages