# Plugin System Documentation

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
        "testCommand": "pnpm test",
        "packageManager": "pnpm"
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
    "packageManager": "pnpm",
    "testCommand": "pnpm test",
    "buildCommand": "pnpm build", 
    "lintCommand": "pnpm lint",
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
- Supports npm, pnpm, yarn, and bun package managers
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
    "packageManager": "pnpm",
    "buildCommand": "pnpm build",
    "registry": "https://registry.npmjs.org",
    "workingDirectory": "./packages/core",
    "releaseIt": true,
    "semanticRelease": false,
    "customReleaseCommand": "pnpm release",
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
     "testCommand": "pnpm test"
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

### Plugin Structure

Create a plugin by implementing the `DotGitHubPlugin` interface:

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
      runsOn: ['ubuntu-latest'],
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
  packageManager: 'pnpm',
  nodeVersions: ['18', '20']
});

// In Release plugin  
const ciMetadata = stack.getMetadata('ci');
if (ciMetadata?.packageManager === 'pnpm') {
  // Use pnpm-specific release commands
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
  const hasWorkspaces = fs.existsSync(path.join(projectRoot, 'pnpm-workspace.yaml'));
  
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
        "packageManager": "pnpm",
        "testCommand": "pnpm test:coverage",
        "buildCommand": "pnpm build",
        "lintCommand": "pnpm lint"
      }
    },
    {
      "name": "release",
      "package": "built-in",
      "config": {
        "branches": ["main"],
        "packageManager": "pnpm",
        "buildCommand": "pnpm build"
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
        "packageManager": "pnpm",
        "workingDirectory": ".",
        "testCommand": "pnpm -r run test",
        "buildCommand": "pnpm -r run build",
        "lintCommand": "pnpm -r run lint"
      }
    },
    {
      "name": "release-core",
      "package": "built-in",
      "config": {
        "workingDirectory": "./packages/core",
        "packageManager": "pnpm",
        "customReleaseCommand": "pnpm changeset publish"
      }
    },
    {
      "name": "release-cli",
      "package": "built-in", 
      "config": {
        "workingDirectory": "./packages/cli",
        "packageManager": "pnpm",
        "customReleaseCommand": "pnpm changeset publish"
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

This completes the comprehensive plugin system documentation. The system provides a flexible, extensible way to generate GitHub repository configurations through declarative plugins and stacks.