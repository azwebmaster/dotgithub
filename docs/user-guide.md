# User Guide

This comprehensive guide covers all aspects of using DotGitHub to manage your GitHub Actions workflows.

## Table of Contents

- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Actions Management](#actions-management)
- [Plugin System](#plugin-system)
- [Stack Management](#stack-management)
- [Workflow Generation](#workflow-generation)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)

## Project Structure

A typical DotGitHub project has the following structure:

```
my-project/
├── src/                          # Generated TypeScript files
│   ├── dotgithub.json           # Main configuration
│   ├── package.json             # Node.js package file
│   ├── tsconfig.json            # TypeScript configuration
│   ├── index.ts                 # Entry point
│   └── actions/                 # Generated action wrappers
│       ├── index.ts             # Root actions index
│       └── actions/             # GitHub Actions
│           ├── index.ts         # Actions organization index
│           ├── checkout.ts      # Checkout action wrapper
│           └── setup-node.ts    # Setup Node action wrapper
├── .github/                     # Generated workflows
│   └── workflows/
│       ├── ci.yml               # CI workflow
│       └── deploy.yml           # Deployment workflow
└── plugins/                     # Custom plugins (optional)
    └── my-plugin.ts
```

## Configuration

### dotgithub.json

The main configuration file controls all aspects of your DotGitHub project:

```json
{
  "version": "1.0.0",
  "rootDir": "src",
  "outputDir": ".github/workflows",
  "actions": [
    {
      "orgRepo": "actions/checkout",
      "ref": "0057852bfaa89a56745cba8c7296529d2fc39830",
      "versionRef": "v4",
      "actionName": "checkout",
      "outputPath": "actions/actions/checkout.ts"
    }
  ],
  "plugins": [
    {
      "name": "local",
      "package": "./index.ts",
      "config": {
        "environment": "production"
      },
      "enabled": true
    }
  ],
  "stacks": [
    {
      "name": "ci",
      "plugins": ["local"],
      "config": {
        "nodeVersion": "18"
      }
    }
  ],
  "options": {
    "tokenSource": "env",
    "formatting": {
      "prettier": true
    }
  }
}
```

### Configuration Options

#### Global Options

- **version** - Configuration schema version
- **rootDir** - Directory for generated TypeScript files
- **outputDir** - Directory for generated workflow files

#### Actions Configuration

Each action entry contains:

- **orgRepo** - GitHub repository (org/repo)
- **ref** - Specific commit SHA
- **versionRef** - Version reference (tag or branch)
- **actionName** - Generated function name
- **outputPath** - Relative path to generated TypeScript file
- **actionPath** - Sub-path for composite actions

#### Plugin Configuration

- **name** - Unique plugin identifier
- **package** - Plugin package path or npm package name
- **config** - Plugin-specific configuration
- **enabled** - Whether the plugin is active

#### Stack Configuration

- **name** - Stack identifier
- **plugins** - Array of plugin names to include
- **config** - Stack-specific configuration

## Actions Management

### Adding Actions

Add GitHub Actions to your project:

```bash
# Add a single action
dotgithub add actions/checkout@v4

# Add multiple actions
dotgithub add actions/checkout@v4 actions/setup-node@v4

# Add with custom name
dotgithub add actions/setup-node@v4 --name setupNode
```

### Listing Actions

View all tracked actions:

```bash
dotgithub list
```

### Updating Actions

Update actions to newer versions:

```bash
# Update all actions
dotgithub update

# Update specific action
dotgithub update actions/checkout

# Update to latest available
dotgithub update actions/checkout --latest
```

### Removing Actions

Remove actions from your project:

```bash
# Remove completely
dotgithub remove actions/checkout@v4

# Remove from tracking only
dotgithub remove actions/checkout@v4 --keep-files
```

### Regenerating Actions

Regenerate TypeScript files:

```bash
# Regenerate all actions
dotgithub regenerate

# Regenerate specific actions
dotgithub regenerate "actions/*"

# Regenerate with cleanup
dotgithub regenerate --prune
```

## Plugin System

### Creating Plugins

Plugins are TypeScript classes that implement the `DotGitHubPlugin` interface:

```typescript
import {
  DotGitHubPlugin,
  GitHubStack,
  WorkflowConstruct,
  JobConstruct,
} from '@dotgithub/core';

export class MyPlugin implements DotGitHubPlugin {
  readonly name = 'my-plugin';
  readonly version = '1.0.0';
  readonly description = 'My custom plugin';

  validate(stack: GitHubStack): void {
    // Validate stack configuration
  }

  describe() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      // ... other metadata
    };
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    // Generate workflow content
  }
}

export default new MyPlugin();
```

### Plugin Configuration

Plugins can accept configuration through the `config` property:

```json
{
  "plugins": [
    {
      "name": "my-plugin",
      "package": "./plugins/my-plugin.ts",
      "config": {
        "environment": "production",
        "timeout": 30,
        "retries": 3
      },
      "enabled": true
    }
  ]
}
```

### Plugin Validation

Use Zod schemas for configuration validation:

```typescript
import { z } from 'zod';

private readonly configSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  timeout: z.number().min(1).max(60).default(10),
  retries: z.number().min(0).max(5).default(3)
});

validate(stack: GitHubStack): void {
  this.configSchema.parse(stack.config);
}
```

### Plugin Management

Manage plugins using the CLI:

```bash
# List plugins
dotgithub plugin list

# Add plugin
dotgithub plugin add --name "my-plugin" --package "./plugins/my-plugin.ts"

# Remove plugin
dotgithub plugin remove --name "my-plugin"

# Describe plugin
dotgithub plugin describe --name "my-plugin"
```

## Stack Management

### Creating Stacks

Stacks group plugins together for organized workflow generation:

```json
{
  "stacks": [
    {
      "name": "ci",
      "plugins": ["checkout", "setup-node", "test"],
      "config": {
        "nodeVersion": "18",
        "testCommand": "npm test"
      }
    },
    {
      "name": "deploy",
      "plugins": ["build", "deploy"],
      "config": {
        "environment": "production",
        "region": "us-east-1"
      }
    }
  ]
}
```

### Stack Management

Manage stacks using the CLI:

```bash
# List stacks
dotgithub plugin stack list

# Add stack
dotgithub plugin stack add --name "ci" --plugins "checkout,setup-node,test"

# Remove stack
dotgithub plugin stack remove --name "ci"
```

## Workflow Generation

### Basic Workflow Creation

Create workflows using the `WorkflowConstruct`:

```typescript
const wf = new WorkflowConstruct(stack, 'ci', {
  name: 'CI Workflow',
  on: {
    push: { branches: ['main'] },
    pull_request: {},
  },
  jobs: {},
});
```

### Adding Jobs

Add jobs to workflows using `JobConstruct`:

```typescript
new JobConstruct(wf, 'test', {
  'runs-on': 'ubuntu-latest',
  steps: [
    checkout('Checkout code').toStep(),
    setupNode('Setup Node.js', {
      'node-version': '18',
    }).toStep(),
    run('Install dependencies', 'npm install').toStep(),
    run('Run tests', 'npm test').toStep(),
  ],
});
```

### Using Actions

Access actions through the `Actions` class:

```typescript
const { checkout, setupNode, uploadArtifact } = new Actions(stack, 'actions');

// Type-safe usage
checkout('Checkout code', {
  'fetch-depth': 1,
  submodules: 'recursive',
}).toStep();
```

### Advanced Job Configuration

Configure complex jobs with dependencies, matrices, and conditions:

```typescript
// Job with dependencies
new JobConstruct(wf, 'deploy', {
  'runs-on': 'ubuntu-latest',
  needs: ['test', 'build'],
  steps: [
    // ... deployment steps
  ],
});

// Matrix job
new JobConstruct(wf, 'test', {
  'runs-on': 'ubuntu-latest',
  strategy: {
    matrix: {
      'node-version': ['16', '18', '20'],
      os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
    },
  },
  steps: [
    setupNode('Setup Node.js', {
      'node-version': '${{ matrix.node-version }}',
    }).toStep(),
  ],
});

// Conditional job
new JobConstruct(wf, 'deploy', {
  'runs-on': 'ubuntu-latest',
  if: "github.ref == 'refs/heads/main'",
  steps: [
    // ... deployment steps
  ],
});
```

### Environment Variables

Set environment variables for jobs:

```typescript
new JobConstruct(wf, 'test', {
  'runs-on': 'ubuntu-latest',
  env: {
    NODE_ENV: 'test',
    CI: 'true',
  },
  steps: [
    // ... test steps
  ],
});
```

### Secrets and Variables

Use GitHub secrets and variables:

```typescript
new JobConstruct(wf, 'deploy', {
  'runs-on': 'ubuntu-latest',
  steps: [
    run('Deploy', 'echo "Deploying to ${{ secrets.ENVIRONMENT }}"').toStep(),
  ],
});
```

## Advanced Features

### Action Pinning

Pin specific action versions for plugins or stacks:

```bash
# Pin for plugin
dotgithub pin actions/checkout v4 --plugin my-plugin

# Pin for stack
dotgithub pin actions/setup-node v4.1.0 --stack ci

# List pins
dotgithub list-pins

# Remove pins
dotgithub unpin actions/checkout --plugin my-plugin
```

### Custom Action Names

Override generated action names:

```bash
dotgithub add actions/setup-node@v4 --name setupNode
```

### Multiple Output Directories

Generate workflows to different directories:

```bash
dotgithub synth --output ./custom-workflows
```

### Dry Run Mode

Preview generated workflows without writing files:

```bash
dotgithub synth --dry-run
```

### Verbose Output

Get detailed information about synthesis:

```bash
dotgithub synth --verbose
```

## Best Practices

### Project Organization

1. **Use meaningful names** - Choose descriptive names for plugins and stacks
2. **Organize by purpose** - Group related functionality into plugins
3. **Version control** - Commit generated workflows to your repository
4. **Document configuration** - Add comments to explain complex configurations

### Plugin Development

1. **Validate configuration** - Always validate plugin configuration
2. **Handle errors gracefully** - Provide clear error messages
3. **Use TypeScript** - Leverage type safety for better development experience
4. **Test thoroughly** - Test plugins with different configurations

### Workflow Design

1. **Keep jobs focused** - Each job should have a single responsibility
2. **Use dependencies** - Chain jobs with `needs` for proper execution order
3. **Optimize for speed** - Use caching and parallel execution where possible
4. **Handle failures** - Include proper error handling and notifications

### Security

1. **Use secrets** - Store sensitive data in GitHub secrets
2. **Minimize permissions** - Use least-privilege access
3. **Validate inputs** - Always validate user inputs and configuration
4. **Keep actions updated** - Regularly update actions for security patches

### Performance

1. **Use caching** - Cache dependencies and build artifacts
2. **Parallel execution** - Run independent jobs in parallel
3. **Optimize images** - Use smaller, more efficient runner images
4. **Monitor usage** - Track GitHub Actions usage and costs

## Troubleshooting

### Common Issues

1. **TypeScript errors** - Check your `tsconfig.json` configuration
2. **Missing actions** - Ensure all used actions are added with `dotgithub add`
3. **Synthesis failures** - Validate plugin configuration and check error messages
4. **Permission issues** - Verify GitHub token permissions and repository access

### Debugging

1. **Use dry run** - Preview changes with `dotgithub synth --dry-run`
2. **Check logs** - Review synthesis output for error details
3. **Validate configuration** - Use `dotgithub config show` to verify settings
4. **Test incrementally** - Build and test plugins one at a time

### Getting Help

- [Command Documentation](command-init.md) - Detailed CLI command reference
- [API Reference](api-reference.md) - Complete API documentation
- [Plugin Development](plugin-development.md) - Advanced plugin creation
- [GitHub Issues](https://github.com/azwebmaster/dotgithub/issues) - Report bugs and request features
- [Discord Community](https://discord.gg/dotgithub) - Get help from the community

## What's Next?

- [Plugin Development Guide](plugin-development.md) - Create advanced plugins
- [API Reference](api-reference.md) - Complete API documentation
- [Configuration Guide](configuration.md) - Deep dive into configuration options
- [Examples](examples.md) - Real-world usage examples
