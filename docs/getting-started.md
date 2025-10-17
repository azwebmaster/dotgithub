# Getting Started

This guide will walk you through creating your first DotGitHub project and generating a simple CI workflow.

## Prerequisites

Before starting, ensure you have:

- [DotGitHub installed](installation.md)
- A GitHub repository
- Basic knowledge of GitHub Actions
- Familiarity with TypeScript (helpful but not required)

## Step 1: Initialize Your Project

Create a new DotGitHub project:

```bash
dotgithub init
```

This creates a basic project structure:

```
src/
├── dotgithub.json      # Configuration file
├── package.json        # Node.js package file
├── tsconfig.json       # TypeScript configuration
└── index.ts           # Entry point file
```

## Step 2: Add GitHub Actions

Add the GitHub Actions you need for your workflow:

```bash
dotgithub add actions/checkout@v4
dotgithub add actions/setup-node@v4
```

This downloads the action metadata and generates TypeScript wrappers.

## Step 3: Create Your First Plugin

Edit `src/index.ts` to create a simple CI plugin:

```typescript
import {
  createStep,
  DotGitHubPlugin,
  GitHubStack,
  JobConstruct,
  run,
  WorkflowConstruct,
} from '@dotgithub/core';
import { Actions } from './actions/index.js';

export class MyFirstPlugin implements DotGitHubPlugin {
  readonly name = 'my-first-plugin';
  readonly version = '1.0.0';
  readonly description = 'My first DotGitHub plugin';

  validate(stack: GitHubStack): void {
    // No validation needed for this simple plugin
  }

  describe() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'Your Name',
      repository: 'https://github.com/yourusername/yourrepo',
      license: 'MIT',
      keywords: ['ci', 'github-actions'],
      category: 'ci',
      tags: ['ci', 'testing'],
      minDotGithubVersion: '1.0.0',
    };
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    const { checkout, setupNode } = new Actions(stack, 'actions');

    // Create a CI workflow
    const wf = new WorkflowConstruct(stack, 'ci', {
      name: 'CI Workflow',
      on: {
        push: { branches: ['main'] },
        pull_request: {},
      },
      jobs: {},
    });

    // Add a test job
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
  }
}

export default new MyFirstPlugin();
```

## Step 4: Configure Your Plugin

Update `src/dotgithub.json` to include your plugin:

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
    },
    {
      "orgRepo": "actions/setup-node",
      "ref": "2028fbc5c25fe9cf00d9f06a71cc4710d4507903",
      "versionRef": "v4",
      "actionName": "setupNode",
      "outputPath": "actions/actions/setup-node.ts"
    }
  ],
  "plugins": [
    {
      "name": "local",
      "package": "./index.ts",
      "config": {},
      "enabled": true
    }
  ],
  "stacks": [
    {
      "name": "app",
      "plugins": ["local"],
      "config": {}
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

## Step 5: Generate Your Workflow

Run the synthesis command to generate your workflow:

```bash
dotgithub synth
```

This creates `.github/workflows/ci.yml`:

```yaml
name: CI Workflow
on:
  push:
    branches:
      - main
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
```

## Step 6: Commit and Push

Add the generated workflow to your repository:

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow"
git push
```

## Understanding the Generated Code

### TypeScript Wrappers

DotGitHub generates type-safe wrappers for GitHub Actions:

```typescript
const { checkout, setupNode } = new Actions(stack, 'actions');

// Type-safe usage with IntelliSense
checkout('Checkout code').toStep();
setupNode('Setup Node.js', {
  'node-version': '18', // TypeScript knows this is a valid input
}).toStep();
```

### Workflow Constructs

- **WorkflowConstruct** - Represents a GitHub workflow
- **JobConstruct** - Represents a workflow job
- **Actions** - Provides type-safe action wrappers

### Plugin Structure

Every plugin implements the `DotGitHubPlugin` interface:

- **name** - Unique plugin identifier
- **version** - Plugin version
- **description** - Human-readable description
- **validate()** - Validates stack configuration
- **describe()** - Returns plugin metadata
- **synthesize()** - Generates workflow content

## Next Steps

Now that you have a basic workflow, you can:

### 1. Add More Actions

```bash
dotgithub add actions/setup-python@v5
dotgithub add actions/upload-artifact@v4
```

### 2. Create Multiple Workflows

Add more plugins for different workflows:

```typescript
// Add a deployment plugin
export class DeployPlugin implements DotGitHubPlugin {
  // ... implementation
}
```

### 3. Use Configuration

Make your plugin configurable:

```typescript
private readonly configSchema = z.object({
  environment: z.string().default('production'),
  nodeVersion: z.string().default('18')
});

validate(stack: GitHubStack): void {
  this.configSchema.parse(stack.config);
}
```

### 4. Add More Jobs

Create complex workflows with multiple jobs:

```typescript
// Add a build job
new JobConstruct(wf, 'build', {
  'runs-on': 'ubuntu-latest',
  needs: ['test'],
  steps: [
    // ... build steps
  ],
});
```

## Common Patterns

### Conditional Steps

```typescript
const steps = [checkout('Checkout').toStep(), setupNode('Setup Node').toStep()];

if (stack.config.environment === 'production') {
  steps.push(run('Deploy', 'npm run deploy').toStep());
}
```

### Matrix Builds

```typescript
new JobConstruct(wf, 'test', {
  'runs-on': 'ubuntu-latest',
  strategy: {
    matrix: {
      'node-version': ['16', '18', '20'],
    },
  },
  steps: [
    setupNode('Setup Node', {
      'node-version': '${{ matrix.node-version }}',
    }).toStep(),
  ],
});
```

### Environment Variables

```typescript
new JobConstruct(wf, 'deploy', {
  'runs-on': 'ubuntu-latest',
  env: {
    NODE_ENV: 'production',
    API_URL: 'https://api.example.com',
  },
  steps: [
    // ... deployment steps
  ],
});
```

## Troubleshooting

### Common Issues

1. **TypeScript errors** - Ensure your `tsconfig.json` is configured correctly
2. **Missing actions** - Run `dotgithub add` for any actions you're using
3. **Synthesis errors** - Check your plugin's `synthesize` method
4. **Configuration errors** - Validate your `dotgithub.json` syntax

### Getting Help

- Check the [command documentation](command-init.md)
- Review the [API reference](api-reference.md)
- Join the [Discord community](https://discord.gg/dotgithub)

## What's Next?

- [User Guide](user-guide.md) - Comprehensive usage guide
- [Plugin Development](plugin-development.md) - Creating advanced plugins
- [API Reference](api-reference.md) - Complete API documentation
- [Configuration Guide](configuration.md) - Understanding configuration options
