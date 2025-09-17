# Plugin Documentation

The dotgithub plugin system allows you to declaratively generate GitHub workflows, configurations, and other repository files through configurable plugins and stacks.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Configuration](#configuration)
- [Built-in Plugins](#built-in-plugins)
- [CLI Commands](#cli-commands)
- [Creating Custom Plugins](#creating-custom-plugins)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

The plugin system enables you to:

- **Generate GitHub workflows** from reusable, configurable plugins
- **Manage multiple stacks** with different plugin combinations
- **Share plugins** across projects through npm packages or local files
- **Validate configurations** with type-safe plugin interfaces
- **Handle dependencies** between plugins automatically

### Architecture

```
dotgithub.json (config) → Plugin Manager → Stack Synthesizer → GitHub Files
     ↓                        ↓                    ↓              ↓
  Plugins[]               Load & Validate      Apply to Stacks   .github/*
  Stacks[]                Dependencies         Generate Files     workflows/
```

## Core Concepts

### Plugins

A **plugin** is a reusable component that modifies a GitHubStack by adding workflows, jobs, resources, or other GitHub repository artifacts.

```typescript
interface DotGitHubPlugin {
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly dependencies?: string[];
  readonly conflicts?: string[];
  
  validate?(context: PluginContext): Promise<void> | void;
  apply(context: PluginContext): Promise<void> | void;
}
```

### Stacks

A **stack** is a named collection of plugins that work together to generate a complete set of GitHub repository files.

```typescript
interface StackConfig {
  name: string;
  plugins: string[];
  config?: Record<string, any>;
}
```

### Plugin Context

When a plugin runs, it receives a context with access to:

```typescript
interface PluginContext {
  stack: GitHubStack;           // The stack being modified
  config: Record<string, any>;  // Plugin-specific configuration
  stackConfig: StackConfig;     // Stack configuration
  projectRoot: string;          // Project root directory
}
```

## Configuration

### dotgithub.json Structure

```json
{
  "version": "1.0.0",
  "outputDir": "src",
  "actions": [...],
  "plugins": [
    {
      "name": "ci",
      "package": "@dotgithub/plugin-ci",
      "config": {
        "nodeVersions": ["18", "20"],
        "testCommand": "bun test",
        "packageManager": "bun"
      },
      "enabled": true
    }
  ],
  "stacks": [
    {
      "name": "main",
      "plugins": ["ci", "release"],
      "config": {
        "environment": "production"
      }
    }
  ]
}
```

### Plugin Configuration

Each plugin in the `plugins` array supports:

- **`name`** (required): Unique identifier for the plugin
- **`package`** (required): NPM package name or local file path
- **`config`** (optional): Plugin-specific configuration object
- **`enabled`** (optional): Whether the plugin is enabled (default: true)

### Stack Configuration

Each stack in the `stacks` array supports:

- **`name`** (required): Unique identifier for the stack
- **`plugins`** (required): Array of plugin names to include
- **`config`** (optional): Stack-level configuration passed to all plugins

## Built-in Plugins

### CI Plugin (`ci`)

Creates standard CI/CD workflows for Node.js projects.

**Configuration Options:**

```json
{
  "name": "ci",
  "package": "built-in",
  "config": {
    "nodeVersions": ["18", "20", "22"],
    "packageManager": "bun",
    "testCommand": "bun test",
    "buildCommand": "bun run build",
    "lintCommand": "bun run lint",
    "workingDirectory": "./packages/api",
    "runOn": ["ubuntu-latest", "windows-latest"],
    "branches": ["main", "develop"],
    "pullRequest": true,
    "push": true
  }
}
```

**Generated Workflow:**
- Runs tests on multiple Node.js versions
- Supports npm, yarn, pnpm, and bun package managers
- Configurable lint and build steps
- Matrix strategy for multiple environments

### Release Plugin (`release`)

Automated release workflow for npm packages.

**Dependencies:** `ci`

**Configuration Options:**

```json
{
  "name": "release",
  "package": "built-in",
  "config": {
    "branches": ["main"],
    "packageManager": "bun",
    "buildCommand": "bun run build",
    "registry": "https://registry.npmjs.org",
    "workingDirectory": "./packages/core",
    "releaseIt": true,
    "semanticRelease": false,
    "customReleaseCommand": "bun run release",
    "nodeVersion": "20"
  }
}
```

**Generated Workflow:**
- Automated semantic releases
- NPM package publishing
- Support for release-it or semantic-release
- Configurable release commands

## CLI Commands

### Synthesis Commands

#### `dotgithub synth`

Synthesizes GitHub workflows from configured stacks.

```bash
# Synthesize all stacks
dotgithub synth

# Dry run (preview without writing files)
dotgithub synth --dry-run

# Synthesize specific stack
dotgithub synth --stack main

# Verbose output
dotgithub synth --verbose

# Custom output directory
dotgithub synth --output .github-custom
```

**Example Output:**
```
🏗️  Synthesizing GitHub workflows...
✅ Successfully synthesized 1 stack(s):

🏗️  Stack: main
   Plugins: ci, release
   Files written:
     📄 /project/.github/workflows/ci.yml
     📄 /project/.github/workflows/release.yml

🎉 Synthesis complete!
```

### Plugin Management

#### `dotgithub plugin list`

List all configured plugins.

```bash
dotgithub plugin list
```

**Example Output:**
```
🔌 Configured plugins (2):

✅ ci
   Package: @dotgithub/plugin-ci
   Config: {
     "nodeVersions": ["18", "20"],
     "testCommand": "bun test"
   }

✅ release
   Package: @dotgithub/plugin-release
   Config: {}
```

#### `dotgithub plugin add`

Add a plugin configuration.

```bash
# Add plugin from npm
dotgithub plugin add \
  --name ci \
  --package @dotgithub/plugin-ci \
  --config '{"nodeVersions":["18","20"]}'

# Add local plugin
dotgithub plugin add \
  --name custom \
  --package ./plugins/custom.js \
  --config '{"customOption":true}'

# Add disabled plugin
dotgithub plugin add \
  --name experimental \
  --package @dotgithub/plugin-experimental \
  --enabled false
```

#### `dotgithub plugin remove`

Remove a plugin configuration.

```bash
dotgithub plugin remove --name ci
```

#### `dotgithub plugin create`

Create a plugin from existing .github files in a local directory or GitHub repository.

```bash
# Create plugin from local .github directory
dotgithub plugin create \
  --name "my-templates" \
  --source ".github" \
  --output "./plugins" \
  --description "My organization's standard GitHub templates"

# Create plugin from GitHub repository
dotgithub plugin create \
  --name "starter-workflows" \
  --source "actions/starter-workflows" \
  --output "./plugins" \
  --description "GitHub's starter workflow templates"

# Create plugin with specific GitHub repo reference
dotgithub plugin create \
  --name "company-templates" \
  --source "myorg/github-templates@main" \
  --output "./plugins" \
  --overwrite

# Create plugin from local path that contains .github directory
dotgithub plugin create \
  --name "project-templates" \
  --source "/path/to/my-project" \
  --output "./plugins"
```

**Options:**

- **`--name <name>`** (required): Name for the generated plugin
- **`--source <path|repo>`** (required): Source of .github files:
  - Local filesystem path (absolute or relative)
  - GitHub repository in `owner/repo` format
  - GitHub repository with ref: `owner/repo@branch-or-tag`
- **`--output <dir>`** (optional): Output directory for plugin file (default: `./plugins`)
- **`--description <desc>`** (optional): Description for the generated plugin
- **`--overwrite`** (optional): Overwrite existing plugin file if it exists

**Example Output:**
```
🔌 Creating plugin "my-templates" from .github...
✅ Plugin created successfully!
   Plugin file: /project/plugins/my-templates-plugin.ts
   Files included: 8
   📁 Files found:
      - workflows/ci.yml
      - workflows/release.yml
      - dependabot.yml
      - CODEOWNERS
      - ISSUE_TEMPLATE/bug_report.md
      - ISSUE_TEMPLATE/feature_request.md
      - pull_request_template.md
      - FUNDING.yml

🔧 To use this plugin, add it to your configuration:
   dotgithub plugin add --name "my-templates" --package "./plugins/my-templates-plugin.ts"
```

The `create` command automatically:
- Recursively scans the `.github` directory for all files
- Generates a TypeScript plugin class that implements `DotGitHubPlugin`
- **Automatically detects workflow files** (`.yml`/`.yaml` in `workflows/` directory)
- **Uses GitHubWorkflow for workflow generation** via `stack.addWorkflow()`
- **Uses stack methods for other files** via `stack.addFileResource()` 
- **Integrates with the stack system** - all resources are properly managed by the stack
- Provides instructions for adding the plugin to your configuration

### Stack Management

#### `dotgithub plugin stack list`

List all configured stacks.

```bash
dotgithub plugin stack list
```

**Example Output:**
```
🏗️  Configured stacks (2):

📦 main
   Plugins: ci, release
   Config: {
     "environment": "production"
   }

📦 development
   Plugins: ci
   Config: {}
```

#### `dotgithub plugin stack add`

Add a stack configuration.

```bash
# Add stack with multiple plugins
dotgithub plugin stack add \
  --name main \
  --plugins ci,release \
  --config '{"environment":"production"}'

# Add stack with single plugin
dotgithub plugin stack add \
  --name development \
  --plugins ci
```

#### `dotgithub plugin stack remove`

Remove a stack configuration.

```bash
dotgithub plugin stack remove --name development
```

## Creating Custom Plugins

### Creating Plugins from Existing .github Files

The easiest way to create a plugin is by generating it from existing `.github` files. This is perfect for:

- **Migrating existing repositories** to the dotgithub plugin system
- **Sharing templates** across multiple projects
- **Standardizing workflows** within an organization
- **Reusing configurations** from open source projects

#### Quick Start: Generate from Local Files

If you already have a `.github` directory with workflows, templates, and configurations:

```bash
# Generate plugin from your current .github directory
dotgithub plugin create \
  --name "my-org-standard" \
  --source ".github" \
  --description "Standard GitHub configuration for my organization"

# Add the plugin to your configuration
dotgithub plugin add \
  --name "my-org-standard" \
  --package "./plugins/my-org-standard-plugin.ts"

# Use it in a stack
dotgithub plugin stack add \
  --name "main" \
  --plugins "my-org-standard"

# Apply to your project
dotgithub synth
```

#### Generate from GitHub Repository

You can also create plugins from any public GitHub repository's `.github` directory:

```bash
# Use GitHub's starter workflows
dotgithub plugin create \
  --name "github-starters" \
  --source "actions/starter-workflows" \
  --description "GitHub's official starter workflow templates"

# Use a specific version/branch
dotgithub plugin create \
  --name "company-templates" \
  --source "mycompany/github-templates@v2.1.0" \
  --description "Company GitHub templates v2.1.0"

# Copy from another organization's repo
dotgithub plugin create \
  --name "best-practices" \
  --source "microsoft/vscode@main" \
  --description "VS Code's GitHub configuration"
```

#### Generated Plugin Structure

The `create` command generates a TypeScript plugin that:

1. **Implements the DotGitHubPlugin interface**
2. **Embeds all found files as string literals**
3. **Recreates the exact directory structure**
4. **Handles conflicts gracefully**

Example generated plugin with workflows:

```typescript
import type { DotGitHubPlugin, PluginContext } from '@dotgithub/core';

/**
 * My organization's standard GitHub templates
 * 
 * This plugin was auto-generated from .github files.
 * Files included: workflows/ci.yml, workflows/release.yml, dependabot.yml
 */
export class MyOrgStandardPlugin implements DotGitHubPlugin {
  readonly name = 'my-org-standard';
  readonly version = '1.0.0';
  readonly description = 'My organization\'s standard GitHub templates';

  private readonly workflows: Record<string, string> = {
    'ci': `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test`,
    
    'release': `name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Release
        run: npm run release`
  };

  private readonly files: Record<string, string> = {
    'dependabot.yml': `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"`
  };

  async apply(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    // Add workflows to stack (pre-parsed objects)
    stack.addWorkflow('ci', this.workflows['ci']);
    stack.addWorkflow('release', this.workflows['release']);
    
    // Add YAML files as parsed objects
    stack.addResource('dependabot.yml', { content: this.files['dependabot.yml'] });
  }
}

// Export as default for easier importing
export default new MyOrgStandardPlugin();
```

**Key Features:**
- **Workflow files** (`.yml`/`.yaml` in `workflows/`) are parsed during generation and added via `stack.addWorkflow()`
- **YAML files** (dependabot.yml, etc.) are parsed during generation and added via `stack.addResource()`
- **Text files** (README.md, CODEOWNERS, etc.) are added as strings via `stack.addFileResource()`
- **No runtime YAML parsing** - all YAML is parsed during plugin generation for better performance
- **Type-safe workflow generation** through the GitHubWorkflow system
- **Stack-based resource management** - all files go through the stack system for proper synthesis

#### Customizing Generated Plugins

After generation, you can edit the plugin to add:

**Configuration Options:**
```typescript
interface MyOrgStandardConfig {
  overwriteExisting?: boolean;
  excludeFiles?: string[];
  nodeVersion?: string;
}

async apply(context: PluginContext): Promise<void> {
  const config = context.config as MyOrgStandardConfig;
  const filesToGenerate = { ...this.files };
  
  // Remove excluded files
  if (config.excludeFiles) {
    config.excludeFiles.forEach(file => delete filesToGenerate[file]);
  }
  
  // Template substitution for node version
  if (config.nodeVersion && filesToGenerate['workflows/ci.yml']) {
    filesToGenerate['workflows/ci.yml'] = filesToGenerate['workflows/ci.yml']
      .replace(/node-version: '[^']*'/, `node-version: '${config.nodeVersion}'`);
  }
  
  const result = generateGitHubFiles({
    outputDir: path.join(context.projectRoot, '.github'),
    files: filesToGenerate,
    overwrite: config.overwriteExisting || false,
    createDirectories: true
  });
  
  // ... rest of apply method
}
```

**Dynamic Content:**
```typescript
async apply(context: PluginContext): Promise<void> {
  const { projectRoot } = context;
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
  );
  
  // Customize workflow based on project structure
  const files = { ...this.files };
  
  // Add TypeScript check if project uses TypeScript
  if (fs.existsSync(path.join(projectRoot, 'tsconfig.json'))) {
    files['workflows/ci.yml'] = files['workflows/ci.yml']
      .replace('- run: npm test', '- run: npm run type-check\n      - run: npm test');
  }
  
  // Use project name in workflow
  if (packageJson.name) {
    files['workflows/ci.yml'] = files['workflows/ci.yml']
      .replace('name: CI', `name: CI - ${packageJson.name}`);
  }
  
  // ... apply files
}
```

#### Best Practices for Generated Plugins

1. **Review generated content** before using in production
2. **Test with different project structures** to ensure compatibility
3. **Add configuration options** for common variations
4. **Document usage** and configuration options
5. **Version your plugins** when making changes
6. **Consider conflicts** with existing files

#### Common Use Cases

**Organization Standards:**
```bash
# Create standard templates from your best repository
dotgithub plugin create \
  --name "acme-standards" \
  --source "/path/to/best-repo/.github" \
  --description "ACME Corp GitHub standards"

# Share across all projects
dotgithub plugin add --name "acme-standards" --package "./acme-standards-plugin.ts"
```

**Open Source Templates:**
```bash
# Copy proven workflows from popular repositories
dotgithub plugin create \
  --name "react-workflows" \
  --source "facebook/react" \
  --description "React project workflows"

dotgithub plugin create \
  --name "vue-workflows" \
  --source "vuejs/core" \
  --description "Vue.js project workflows"
```

**Migration from Manual Setup:**
```bash
# Convert existing manual .github setup to plugin
dotgithub plugin create \
  --name "legacy-migration" \
  --source ".github" \
  --description "Migrated from manual setup"

# Now manage via plugins instead of manual files
rm -rf .github
dotgithub plugin add --name "legacy-migration" --package "./legacy-migration-plugin.ts"
dotgithub synth
```

### Manual Plugin Creation

For more complex scenarios, you can create plugins manually by implementing the `DotGitHubPlugin` interface:

```typescript
// plugins/custom-security.ts
import { BasePlugin } from '@dotgithub/core';
import type { PluginContext } from '@dotgithub/core';

export interface SecurityPluginConfig {
  enableCodeQL?: boolean;
  enableDependabot?: boolean;
  scanSchedule?: string;
}

export class SecurityPlugin extends BasePlugin {
  override readonly name = 'security';
  override readonly version = '1.0.0';
  override readonly description = 'Security scanning workflows';

  override validate(context: PluginContext): void {
    const config = context.config as SecurityPluginConfig;
    
    if (config.scanSchedule && !config.scanSchedule.match(/^[0-9\s\*\/\-\,]+$/)) {
      throw new Error('Invalid cron schedule format');
    }
  }

  override apply(context: PluginContext): void {
    const config = context.config as SecurityPluginConfig;
    const { stack } = context;

    if (config.enableCodeQL !== false) {
      this.addCodeQLWorkflow(stack, config);
    }

    if (config.enableDependabot !== false) {
      this.addDependabotConfig(stack, config);
    }
  }

  private addCodeQLWorkflow(stack: GitHubStack, config: SecurityPluginConfig) {
    const workflow = new WorkflowConstruct(stack, 'security', {
      name: 'Security Scan',
      on: {
        schedule: [{ cron: config.scanSchedule || '0 6 * * 1' }],
        push: { branches: ['main'] },
        pull_request: { branches: ['main'] }
      },
      permissions: {
        actions: 'read',
        contents: 'read',
        'security-events': 'write'
      }
    });

    const scanJob = new JobConstruct(workflow, 'analyze', {
      'runs-on: ['ubuntu-latest'],
      strategy: {
        matrix: {
          language: ['javascript', 'typescript']
        }
      },
      steps: [
        createStep('actions/checkout@v4'),
        createStep('github/codeql-action/init@v3', {
          with: {
            languages: '${{ matrix.language }}'
          }
        }),
        createStep('github/codeql-action/analyze@v3')
      ]
    });

    workflow.addJob('analyze', scanJob);
    
    stack.setMetadata('security', {
      codeQLEnabled: true,
      scanSchedule: config.scanSchedule || '0 6 * * 1'
    });
  }

  private addDependabotConfig(stack: GitHubStack, config: SecurityPluginConfig) {
    const dependabotConfig = {
      version: 2,
      updates: [
        {
          'package-ecosystem': 'npm',
          directory: '/',
          schedule: {
            interval: 'weekly',
            day: 'monday'
          },
          'open-pull-requests-limit': 10
        }
      ]
    };

    stack.addFileResource('dependabot.yml', JSON.stringify(dependabotConfig, null, 2));
  }
}

// Export for use
export const securityPlugin = new SecurityPlugin();
export default securityPlugin;
```

### Publishing as NPM Package

```json
// package.json
{
  "name": "@myorg/dotgithub-plugin-security",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@dotgithub/core": "^0.1.0"
  }
}
```

```typescript
// src/index.ts
export { SecurityPlugin, securityPlugin } from './security-plugin';
export type { SecurityPluginConfig } from './security-plugin';

// Default export for easy plugin loading
export default securityPlugin;
```

### Local Plugin Files

For simple local plugins:

```javascript
// plugins/notify-slack.js
module.exports = {
  name: 'notify-slack',
  description: 'Slack notification workflows',
  
  validate(context) {
    if (!context.config.webhookUrl) {
      throw new Error('webhookUrl is required');
    }
  },
  
  apply(context) {
    const { stack, config } = context;
    
    // Add Slack notification step to existing workflows
    const workflows = stack.workflows;
    Object.values(workflows).forEach(workflow => {
      Object.values(workflow.jobs).forEach(job => {
        job.steps.push({
          name: 'Notify Slack',
          if: 'failure()',
          uses: 'rtCamp/action-slack-notify@v2',
          env: {
            SLACK_WEBHOOK: config.webhookUrl,
            SLACK_MESSAGE: 'Build failed!'
          }
        });
      });
    });
  }
};
```

## Advanced Usage

### Plugin Dependencies

Plugins can declare dependencies and conflicts:

```typescript
export class ReleasePlugin extends BasePlugin {
  override readonly dependencies = ['ci'];        // Requires CI plugin
  override readonly conflicts = ['manual-deploy']; // Cannot coexist
  
  // ...
}
```

### Stack Metadata

Plugins can share data through stack metadata:

```typescript
// In CI plugin
stack.setMetadata('ci', {
  hasTests: true,
  packageManager: 'bun',
  nodeVersions: ['18', '20']
});

// In Release plugin  
const ciMetadata = stack.getMetadata('ci');
if (ciMetadata?.packageManager === 'bun') {
  // Use bun-specific release commands
}
```

### Conditional Logic

Plugins can inspect project structure:

```typescript
apply(context: PluginContext): void {
  const { projectRoot } = context;
  
  // Check if project has TypeScript
  const hasTSConfig = fs.existsSync(path.join(projectRoot, 'tsconfig.json'));
  
  // Check if project is a monorepo
  const hasWorkspaces = fs.existsSync(path.join(projectRoot, 'bun-workspace.yaml'));
  
  if (hasTSConfig) {
    this.addTypeCheckStep();
  }
  
  if (hasWorkspaces) {
    this.configureMonorepoBuilds();
  }
}
```

### Custom Workflow Templates

```typescript
private createCustomWorkflow(stack: GitHubStack, config: any) {
  const workflow = new WorkflowConstruct(stack, 'custom', {
    name: config.workflowName || 'Custom Workflow',
    on: this.buildTriggers(config),
    env: config.globalEnv || {},
    permissions: config.permissions || {},
    concurrency: config.concurrency
  });

  const jobs = config.jobs || [{ name: 'default', steps: [] }];
  
  jobs.forEach((jobConfig: any) => {
    const job = new JobConstruct(workflow, jobConfig.name, {
      runsOn: jobConfig.runsOn || ['ubuntu-latest'],
      env: jobConfig.env,
      strategy: jobConfig.strategy,
      steps: jobConfig.steps.map((step: any) => 
        step.uses ? createStep(step.uses, step) : step
      )
    });
    
    workflow.addJob(jobConfig.name, job);
  });
  
  return workflow;
}
```

## Examples

### Creating and Using a Plugin from .github Files

Here's a complete example of creating a plugin from existing .github files and using it in a project:

```bash
# Step 1: Create plugin from existing repository
dotgithub plugin create \
  --name "company-standards" \
  --source "https://github.com/mycompany/github-templates" \
  --output "./plugins" \
  --description "My company's standard GitHub configuration"

# Step 2: Add plugin to dotgithub configuration
dotgithub plugin add \
  --name "company-standards" \
  --package "./plugins/company-standards-plugin.ts" \
  --config '{
    "overwriteExisting": false,
    "nodeVersion": "20"
  }'

# Step 3: Create a stack using the plugin
dotgithub plugin stack add \
  --name "frontend" \
  --plugins "company-standards" \
  --config '{
    "projectType": "frontend"
  }'

# Step 4: Generate .github files for your project
dotgithub synth --stack frontend
```

**Generated dotgithub.json:**
```json
{
  "version": "1.0.0",
  "outputDir": "src",
  "plugins": [
    {
      "name": "company-standards",
      "package": "./plugins/company-standards-plugin.ts",
      "config": {
        "overwriteExisting": false,
        "nodeVersion": "20"
      },
      "enabled": true
    }
  ],
  "stacks": [
    {
      "name": "frontend",
      "plugins": ["company-standards"],
      "config": {
        "projectType": "frontend"
      }
    }
  ]
}
```

**Output:**
```
🏗️  Synthesizing GitHub workflows...
🔌 Applying plugin: company-standards
✅ Generated 5 .github files:
   - .github/workflows/ci.yml
   - .github/workflows/release.yml
   - .github/dependabot.yml
   - .github/CODEOWNERS
   - .github/pull_request_template.md

✅ Successfully synthesized 1 stack(s)
🎉 Synthesis complete!
```

### Complete Project Setup

```json
{
  "version": "1.0.0",
  "outputDir": "src",
  "plugins": [
    {
      "name": "ci",
      "package": "built-in",
      "config": {
        "nodeVersions": ["18", "20"],
        "packageManager": "bun",
        "testCommand": "bun test:coverage",
        "buildCommand": "bun run build",
        "lintCommand": "bun run lint"
      }
    },
    {
      "name": "release",
      "package": "built-in",
      "config": {
        "branches": ["main"],
        "packageManager": "bun",
        "buildCommand": "bun run build"
      }
    },
    {
      "name": "security",
      "package": "@myorg/dotgithub-plugin-security",
      "config": {
        "enableCodeQL": true,
        "enableDependabot": true,
        "scanSchedule": "0 6 * * 1"
      }
    },
    {
      "name": "docs",
      "package": "./plugins/docs-generator.js",
      "config": {
        "sourceDir": "src",
        "outputDir": "docs",
        "deployToBranch": "gh-pages"
      }
    }
  ],
  "stacks": [
    {
      "name": "production",
      "plugins": ["ci", "security", "release"],
      "config": {
        "environment": "production",
        "requireReviews": true
      }
    },
    {
      "name": "development", 
      "plugins": ["ci", "docs"],
      "config": {
        "environment": "development"
      }
    }
  ]
}
```

### Monorepo Configuration

```json
{
  "plugins": [
    {
      "name": "ci",
      "package": "built-in",
      "config": {
        "packageManager": "bun",
        "workingDirectory": ".",
        "testCommand": "bun run test",
        "buildCommand": "bun run build",
        "lintCommand": "bun run lint"
      }
    },
    {
      "name": "release-core",
      "package": "built-in",
      "config": {
        "workingDirectory": "./packages/core",
        "packageManager": "bun",
        "customReleaseCommand": "bun changeset publish"
      }
    },
    {
      "name": "release-cli",
      "package": "built-in", 
      "config": {
        "workingDirectory": "./packages/cli",
        "packageManager": "bun",
        "customReleaseCommand": "bun changeset publish"
      }
    }
  ],
  "stacks": [
    {
      "name": "core-package",
      "plugins": ["ci", "release-core"]
    },
    {
      "name": "cli-package", 
      "plugins": ["ci", "release-cli"]
    }
  ]
}
```

## Troubleshooting

### Common Issues

#### Plugin Not Found
```
❌ Failed to load plugin "my-plugin" from "@myorg/dotgithub-plugin-missing"
```

**Solution:** Install the plugin package:
```bash
npm install @myorg/dotgithub-plugin-missing
```

#### Plugin Dependencies Missing
```
❌ Plugin "release" depends on "ci" which is not included in the stack
```

**Solution:** Add the dependency to your stack:
```json
{
  "name": "my-stack",
  "plugins": ["ci", "release"]
}
```

#### Invalid Configuration
```
❌ Plugin "ci" is missing required configuration: testCommand
```

**Solution:** Add the required configuration:
```json
{
  "name": "ci",
  "config": {
    "testCommand": "npm test"
  }
}
```

#### Synthesis Errors
```
❌ Synthesis failed: Error writing file workflows/ci.yml
```

**Solutions:**
- Check file permissions on `.github/` directory
- Ensure no conflicting files exist
- Run with `--dry-run` to preview changes first

### Debug Mode

Enable verbose logging:

```bash
# Dry run with verbose output
dotgithub synth --dry-run --verbose

# Check plugin loading
dotgithub plugin list --verbose
```

### Validation

Validate your configuration:

```bash
# Test synthesis without writing files
dotgithub synth --dry-run

# Validate plugin configurations
dotgithub plugin list
```

### Plugin Development

When developing plugins:

1. **Start with local files** before publishing to npm
2. **Use TypeScript** for better development experience
3. **Test thoroughly** with different configurations
4. **Handle errors gracefully** with meaningful messages
5. **Document configuration options** clearly

```bash
# Test local plugin
dotgithub plugin add --name test --package ./my-plugin.js
dotgithub synth --dry-run --verbose
```

### Plugin Creation from .github Files

Common issues when creating plugins from .github files:

#### Source Path Issues
```
❌ Path does not exist: .github
```
**Solutions:**
- Ensure the path exists and contains .github directory
- Use absolute paths if relative paths don't work
- For GitHub repos, verify the repository exists and has a .github directory

#### GitHub Access Issues
```
❌ No .github directory found in myorg/myrepo
```
**Solutions:**
- Verify the repository exists and is accessible
- Ensure GITHUB_TOKEN environment variable is set for private repositories
- Check that the specified branch/tag exists

#### File Permission Issues
```
❌ Plugin file already exists: ./plugins/my-plugin-plugin.ts
```
**Solutions:**
- Use `--overwrite` flag to replace existing plugins
- Choose a different plugin name with `--name`
- Remove the existing file manually

#### Empty or Invalid .github Directory
```
❌ No files found in: .github
```
**Solutions:**
- Ensure the .github directory contains files
- Check that the directory isn't empty or contains only hidden files
- Verify file permissions allow reading

This completes the comprehensive plugin system documentation. The system provides a flexible, extensible way to generate GitHub repository configurations through declarative plugins and stacks.