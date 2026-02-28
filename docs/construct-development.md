# Construct Development Guide

This guide covers creating custom constructs for DotGitHub, from basic constructs to advanced features.

## Table of Contents

- [Construct Basics](#construct-basics)
- [Construct Interface](#construct-interface)
- [Configuration Management](#configuration-management)
- [Workflow Generation](#workflow-generation)
- [Advanced Features](#advanced-features)
- [Testing Constructs](#testing-constructs)
- [Publishing Constructs](#publishing-constructs)
- [Best Practices](#best-practices)

## Construct Basics

### What is a Construct?

A construct is a TypeScript class that implements the `GitHubConstruct` interface. Constructs generate GitHub Actions workflows or other .github resources based on configuration and can be reused across different projects.

### Construct Structure

Every construct must implement three methods:

```typescript
import { GitHubConstruct, GitHubStack } from '@dotgithub/core';

export class MyConstruct implements GitHubConstruct {
  readonly name = 'my-construct';
  readonly version = '1.0.0';
  readonly description = 'My custom construct';

  validate(stack: GitHubStack): void {
    // Validate configuration
  }

  describe() {
    // Return construct metadata
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    // Generate workflows
  }
}

export default new MyConstruct();
```

## Construct Interface

### Required Properties

#### name

Unique identifier for your construct. Use kebab-case naming.

```typescript
readonly name = 'my-awesome-construct';
```

#### version

Construct version following semantic versioning.

```typescript
readonly version = '1.2.3';
```

#### description

Human-readable description of what the construct does.

```typescript
readonly description = 'Generates CI workflows for Node.js projects';
```

### Required Methods

#### validate(stack: GitHubStack): void

Validates the stack configuration. Should throw an error if invalid.

```typescript
validate(stack: GitHubStack): void {
  const schema = z.object({
    nodeVersion: z.string().regex(/^\d+\.\d+$/, 'Invalid Node version format'),
    testCommand: z.string().default('npm test'),
    environment: z.enum(['development', 'staging', 'production'])
  });

  try {
    schema.parse(stack.config);
  } catch (error) {
    throw new Error(`Invalid configuration: ${error.message}`);
  }
}
```

#### describe(): ConstructDescription

Returns metadata about the construct.

```typescript
describe(): ConstructDescription {
  return {
    name: this.name,
    version: this.version,
    description: this.description,
    author: 'Your Name',
    repository: 'https://github.com/yourusername/yourrepo',
    license: 'MIT',
    keywords: ['ci', 'nodejs', 'github-actions'],
    category: 'ci',
    tags: ['ci', 'testing', 'nodejs'],
    minDotGithubVersion: '1.0.0',
    configSchema: this.configSchema
  };
}
```

#### synthesize(stack: GitHubStack): Promise<void>

Generates workflow content for the stack.

```typescript
async synthesize(stack: GitHubStack): Promise<void> {
  const wf = new WorkflowConstruct(stack, 'ci', {
    name: 'CI Workflow',
    on: { push: { branches: ['main'] } },
    jobs: {}
  });

  // Add jobs and steps...
}
```

## Configuration Management

### Using Zod for Validation

Zod provides type-safe schema validation:

```typescript
import { z } from 'zod';

export class ConfigurableConstruct implements GitHubConstruct {
  private readonly configSchema = z.object({
    // Required fields
    environment: z.enum(['development', 'staging', 'production']),

    // Optional fields with defaults
    nodeVersion: z.string().default('18'),
    testCommand: z.string().default('npm test'),
    timeout: z.number().min(1).max(60).default(10),

    // Complex validation
    retries: z.number().min(0).max(5).default(3),
    parallel: z.boolean().default(false),

    // Nested objects
    deploy: z
      .object({
        enabled: z.boolean().default(false),
        region: z.string().default('us-east-1'),
        bucket: z.string().optional(),
      })
      .optional(),
  });

  validate(stack: GitHubStack): void {
    this.configSchema.parse(stack.config);
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    const config = this.configSchema.parse(stack.config);

    // Use validated configuration
    console.log(`Environment: ${config.environment}`);
    console.log(`Node version: ${config.nodeVersion}`);
  }
}
```

### Configuration Examples

#### Basic Configuration

```json
{
  "constructs": [
    {
      "name": "my-construct",
      "package": "./constructs/my-construct.ts",
      "config": {
        "environment": "production",
        "nodeVersion": "18",
        "testCommand": "npm run test:ci"
      },
      "enabled": true
    }
  ]
}
```

#### Advanced Configuration

```json
{
  "constructs": [
    {
      "name": "advanced-construct",
      "package": "./constructs/advanced-construct.ts",
      "config": {
        "environment": "production",
        "nodeVersion": "18",
        "timeout": 30,
        "retries": 3,
        "parallel": true,
        "deploy": {
          "enabled": true,
          "region": "us-west-2",
          "bucket": "my-deployment-bucket"
        }
      },
      "enabled": true
    }
  ]
}
```

## Workflow Generation

### Basic Workflow Creation

```typescript
import { WorkflowConstruct, JobConstruct } from '@dotgithub/core';

async synthesize(stack: GitHubStack): Promise<void> {
  const wf = new WorkflowConstruct(stack, 'ci', {
    name: 'CI Workflow',
    on: {
      push: { branches: ['main'] },
      pull_request: {}
    },
    jobs: {}
  });

  new JobConstruct(wf, 'test', {
    'runs-on': 'ubuntu-latest',
    steps: [
      {
        name: 'Checkout',
        uses: 'actions/checkout@v4'
      },
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '18'
        }
      },
      {
        name: 'Install dependencies',
        run: 'npm install'
      },
      {
        name: 'Run tests',
        run: 'npm test'
      }
    ]
  });
}
```

### Using Type-Safe Actions

```typescript
import { Actions } from '@dotgithub/core';

async synthesize(stack: GitHubStack): Promise<void> {
  const { checkout, setupNode, uploadArtifact } = new Actions(stack, 'actions');

  const wf = new WorkflowConstruct(stack, 'ci', {
    name: 'CI Workflow',
    on: { push: { branches: ['main'] } },
    jobs: {}
  });

  new JobConstruct(wf, 'test', {
    'runs-on': 'ubuntu-latest',
    steps: [
      checkout('Checkout code', {
        'fetch-depth': 1,
        'submodules': 'recursive'
      }).toStep(),

      setupNode('Setup Node.js', {
        'node-version': '18',
        'cache': 'npm'
      }).toStep(),

      {
        name: 'Install dependencies',
        run: 'npm ci'
      },

      {
        name: 'Run tests',
        run: 'npm test'
      },

      uploadArtifact('Upload test results', {
        name: 'test-results',
        path: 'test-results/'
      }).toStep()
    ]
  });
}
```

### Advanced Job Configuration

#### Matrix Builds

```typescript
new JobConstruct(wf, 'test', {
  'runs-on': 'ubuntu-latest',
  strategy: {
    matrix: {
      'node-version': ['16', '18', '20'],
      os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
    },
    failFast: false,
    maxParallel: 3,
  },
  steps: [
    setupNode('Setup Node.js', {
      'node-version': '${{ matrix.node-version }}',
    }).toStep(),
    {
      name: 'Test on ${{ matrix.os }}',
      run: 'npm test',
    },
  ],
});
```

#### Job Dependencies

```typescript
// Build job
new JobConstruct(wf, 'build', {
  'runs-on': 'ubuntu-latest',
  steps: [
    checkout('Checkout').toStep(),
    setupNode('Setup Node').toStep(),
    {
      name: 'Build',
      run: 'npm run build',
    },
  ],
});

// Test job (depends on build)
new JobConstruct(wf, 'test', {
  'runs-on': 'ubuntu-latest',
  needs: ['build'],
  steps: [
    checkout('Checkout').toStep(),
    setupNode('Setup Node').toStep(),
    {
      name: 'Test',
      run: 'npm test',
    },
  ],
});

// Deploy job (depends on both)
new JobConstruct(wf, 'deploy', {
  'runs-on': 'ubuntu-latest',
  needs: ['build', 'test'],
  if: "github.ref == 'refs/heads/main'",
  steps: [
    {
      name: 'Deploy',
      run: 'npm run deploy',
    },
  ],
});
```

#### Conditional Jobs

```typescript
new JobConstruct(wf, 'deploy', {
  'runs-on': 'ubuntu-latest',
  if: "github.ref == 'refs/heads/main' && github.event_name == 'push'",
  steps: [
    {
      name: 'Deploy to production',
      run: 'npm run deploy:prod',
    },
  ],
});
```

## Advanced Features

### Shared Workflows

Create reusable workflow definitions:

```typescript
import { SharedWorkflowConstruct } from '@dotgithub/core';

async synthesize(stack: GitHubStack): Promise<void> {
  const sharedWf = new SharedWorkflowConstruct(stack, 'ci-shared', {
    name: 'Shared CI Workflow',
    description: 'Reusable CI workflow for Node.js projects',
    inputs: {
      'node-version': {
        description: 'Node.js version to use',
        required: true,
        default: '18'
      },
      'test-command': {
        description: 'Test command to run',
        required: false,
        default: 'npm test'
      }
    },
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout',
            uses: 'actions/checkout@v4'
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '${{ inputs.node-version }}'
            }
          },
          {
            name: 'Run tests',
            run: '${{ inputs.test-command }}'
          }
        ]
      }
    }
  });
}
```

### Environment Variables

```typescript
new JobConstruct(wf, 'test', {
  'runs-on': 'ubuntu-latest',
  env: {
    NODE_ENV: 'test',
    CI: 'true',
    COVERAGE: 'true',
  },
  steps: [
    {
      name: 'Run tests with coverage',
      run: 'npm run test:coverage',
      env: {
        COVERAGE_THRESHOLD: '80',
      },
    },
  ],
});
```

### Secrets and Variables

```typescript
new JobConstruct(wf, 'deploy', {
  'runs-on': 'ubuntu-latest',
  steps: [
    {
      name: 'Deploy',
      run: 'npm run deploy',
      env: {
        DEPLOY_TOKEN: '${{ secrets.DEPLOY_TOKEN }}',
        ENVIRONMENT: '${{ vars.ENVIRONMENT }}',
      },
    },
  ],
});
```

### Custom Steps

```typescript
import { createStep, run } from '@dotgithub/core';

const steps = [
  checkout('Checkout').toStep(),
  setupNode('Setup Node').toStep(),

  // Custom step
  createStep('Custom step', 'echo "Hello from custom step"', {
    env: {
      CUSTOM_VAR: 'custom-value',
    },
  }),

  // Run step with options
  run('Run tests', 'npm test', {
    shell: 'bash',
    continueOnError: false,
    timeoutMinutes: 10,
  }),
];
```

## Testing Constructs

### Unit Testing

Test your construct logic:

```typescript
import { describe, it, expect } from 'vitest';
import { MyConstruct } from './my-construct';

describe('MyConstruct', () => {
  const construct = new MyConstruct();

  it('should validate correct configuration', () => {
    const stack = {
      name: 'test',
      config: {
        environment: 'production',
        nodeVersion: '18',
      },
      constructs: [],
    };

    expect(() => construct.validate(stack)).not.toThrow();
  });

  it('should reject invalid configuration', () => {
    const stack = {
      name: 'test',
      config: {
        environment: 'invalid',
      },
      constructs: [],
    };

    expect(() => construct.validate(stack)).toThrow();
  });

  it('should return correct metadata', () => {
    const description = construct.describe();

    expect(description.name).toBe('my-construct');
    expect(description.version).toBe('1.0.0');
    expect(description.description).toBe('My custom construct');
  });
});
```

### Integration Testing

Test workflow generation:

```typescript
import { describe, it, expect } from 'vitest';
import { MyConstruct } from './my-construct';

describe('MyConstruct Integration', () => {
  it('should generate correct workflow', async () => {
    const construct = new MyConstruct();
    const stack = {
      name: 'test',
      config: {
        environment: 'production',
        nodeVersion: '18',
      },
      constructs: [],
    };

    await construct.synthesize(stack);

    // Verify workflow was generated correctly
    // This would require access to the generated workflow content
  });
});
```

## Publishing Constructs

### NPM Package

Create an NPM package for your construct:

#### package.json

```json
{
  "name": "@yourorg/dotgithub-construct-nodejs",
  "version": "1.0.0",
  "description": "DotGitHub construct for Node.js projects",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "keywords": ["dotgithub", "construct", "nodejs", "ci"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@dotgithub/core": "^1.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

#### Build Script

```json
{
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  }
}
```

### Local Construct

For local development, reference the construct directly:

```json
{
  "constructs": [
    {
      "name": "local-construct",
      "package": "./constructs/my-construct.ts",
      "config": {
        "environment": "development"
      },
      "enabled": true
    }
  ]
}
```

## Best Practices

### Construct Design

1. **Single Responsibility** - Each construct should have one clear purpose
2. **Configuration Validation** - Always validate configuration with Zod
3. **Error Handling** - Provide clear error messages
4. **Documentation** - Document all configuration options
5. **Versioning** - Use semantic versioning

### Performance

1. **Lazy Loading** - Only load what you need
2. **Caching** - Cache expensive operations
3. **Parallel Execution** - Use matrix builds for parallel jobs
4. **Minimal Dependencies** - Keep dependencies minimal

### Security

1. **Input Validation** - Validate all inputs
2. **Secrets Management** - Use GitHub secrets for sensitive data
3. **Least Privilege** - Use minimal required permissions
4. **Dependency Updates** - Keep dependencies updated

### Testing

1. **Unit Tests** - Test individual methods
2. **Integration Tests** - Test workflow generation
3. **Configuration Tests** - Test various configurations
4. **Error Tests** - Test error conditions

### Documentation

1. **README** - Include setup and usage instructions
2. **Configuration** - Document all configuration options
3. **Examples** - Provide usage examples
4. **Changelog** - Track changes and breaking changes

## Examples

### Complete Construct Example

```typescript
import { z } from 'zod';
import {
  GitHubConstruct,
  GitHubStack,
  WorkflowConstruct,
  JobConstruct,
  Actions,
} from '@dotgithub/core';

export class NodeJSConstruct implements GitHubConstruct {
  readonly name = 'nodejs-construct';
  readonly version = '1.0.0';
  readonly description = 'Comprehensive Node.js CI/CD construct';

  private readonly configSchema = z.object({
    environment: z.enum(['development', 'staging', 'production']),
    nodeVersion: z.string().default('18'),
    testCommand: z.string().default('npm test'),
    buildCommand: z.string().default('npm run build'),
    deployCommand: z.string().optional(),
    coverage: z.boolean().default(true),
    matrix: z
      .object({
        nodeVersions: z.array(z.string()).default(['16', '18', '20']),
        os: z.array(z.string()).default(['ubuntu-latest']),
      })
      .default({}),
    deploy: z
      .object({
        enabled: z.boolean().default(false),
        environment: z.string().optional(),
        region: z.string().default('us-east-1'),
      })
      .optional(),
  });

  validate(stack: GitHubStack): void {
    this.configSchema.parse(stack.config);
  }

  describe() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'Your Name',
      repository: 'https://github.com/yourusername/nodejs-construct',
      license: 'MIT',
      keywords: ['nodejs', 'ci', 'cd', 'github-actions'],
      category: 'ci',
      tags: ['nodejs', 'ci', 'testing', 'deployment'],
      minDotGithubVersion: '1.0.0',
      configSchema: this.configSchema,
    };
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    const config = this.configSchema.parse(stack.config);
    const { checkout, setupNode, uploadArtifact } = new Actions(
      stack,
      'actions'
    );

    const wf = new WorkflowConstruct(stack, 'ci', {
      name: 'Node.js CI/CD',
      on: {
        push: { branches: ['main'] },
        pull_request: {},
      },
      jobs: {},
    });

    // Test job with matrix
    new JobConstruct(wf, 'test', {
      'runs-on': 'ubuntu-latest',
      strategy: {
        matrix: {
          'node-version': config.matrix.nodeVersions,
          os: config.matrix.os,
        },
      },
      steps: [
        checkout('Checkout code').toStep(),
        setupNode('Setup Node.js', {
          'node-version': '${{ matrix.node-version }}',
          cache: 'npm',
        }).toStep(),
        {
          name: 'Install dependencies',
          run: 'npm ci',
        },
        {
          name: 'Run tests',
          run: config.testCommand,
          env: {
            NODE_ENV: 'test',
            CI: 'true',
          },
        },
        ...(config.coverage
          ? [
              {
                name: 'Upload coverage',
                uses: 'codecov/codecov-action@v3',
                with: {
                  token: '${{ secrets.CODECOV_TOKEN }}',
                },
              },
            ]
          : []),
      ],
    });

    // Build job
    new JobConstruct(wf, 'build', {
      'runs-on': 'ubuntu-latest',
      needs: ['test'],
      steps: [
        checkout('Checkout code').toStep(),
        setupNode('Setup Node.js', {
          'node-version': config.nodeVersion,
          cache: 'npm',
        }).toStep(),
        {
          name: 'Install dependencies',
          run: 'npm ci',
        },
        {
          name: 'Build',
          run: config.buildCommand,
        },
        uploadArtifact('Upload build artifacts', {
          name: 'build-artifacts',
          path: 'dist/',
        }).toStep(),
      ],
    });

    // Deploy job (if enabled)
    if (config.deploy?.enabled) {
      new JobConstruct(wf, 'deploy', {
        'runs-on': 'ubuntu-latest',
        needs: ['build'],
        if: "github.ref == 'refs/heads/main'",
        environment: config.deploy.environment,
        steps: [
          {
            name: 'Download build artifacts',
            uses: 'actions/download-artifact@v3',
            with: {
              name: 'build-artifacts',
              path: 'dist/',
            },
          },
          {
            name: 'Deploy',
            run: config.deployCommand || 'npm run deploy',
            env: {
              NODE_ENV: config.environment,
              AWS_REGION: config.deploy.region,
            },
          },
        ],
      });
    }
  }
}

export default new NodeJSConstruct();
```

This comprehensive construct demonstrates:

- Configuration validation with Zod
- Matrix builds for multiple Node.js versions
- Conditional job creation
- Artifact handling
- Environment-specific deployment
- Comprehensive error handling and documentation
