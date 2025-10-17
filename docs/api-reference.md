# API Reference

Complete reference for the DotGitHub TypeScript API.

## Table of Contents

- [Core Types](#core-types)
- [Plugin Interface](#plugin-interface)
- [Workflow Constructs](#workflow-constructs)
- [Action Constructs](#action-constructs)
- [Utility Functions](#utility-functions)
- [Configuration Types](#configuration-types)

## Core Types

### DotGitHubPlugin

The main interface that all plugins must implement.

```typescript
interface DotGitHubPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  validate(stack: GitHubStack): void;
  describe(): PluginDescription;
  synthesize(stack: GitHubStack): Promise<void>;
}
```

### GitHubStack

Represents a stack configuration and provides context for plugin execution.

```typescript
interface GitHubStack {
  readonly name: string;
  readonly config: Record<string, any>;
  readonly plugins: string[];
}
```

### PluginDescription

Metadata about a plugin.

```typescript
interface PluginDescription {
  name: string;
  version: string;
  description: string;
  author?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  category?: string;
  tags?: string[];
  minDotGithubVersion?: string;
  configSchema?: z.ZodSchema;
}
```

## Plugin Interface

### validate(stack: GitHubStack): void

Validates the stack configuration. Should throw an error if the configuration is invalid.

```typescript
validate(stack: GitHubStack): void {
  const schema = z.object({
    environment: z.enum(['development', 'staging', 'production']),
    timeout: z.number().min(1).max(60).default(10)
  });
  
  schema.parse(stack.config);
}
```

### describe(): PluginDescription

Returns metadata about the plugin.

```typescript
describe(): PluginDescription {
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
    minDotGithubVersion: '1.0.0'
  };
}
```

### synthesize(stack: GitHubStack): Promise<void>

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

## Workflow Constructs

### WorkflowConstruct

Creates and configures GitHub workflows.

```typescript
class WorkflowConstruct {
  constructor(
    stack: GitHubStack,
    id: string,
    props: WorkflowProps
  );
}
```

#### WorkflowProps

```typescript
interface WorkflowProps {
  name: string;
  on: WorkflowTrigger;
  jobs: Record<string, JobDefinition>;
  env?: Record<string, string>;
  defaults?: WorkflowDefaults;
  concurrency?: ConcurrencyConfig;
}
```

#### WorkflowTrigger

```typescript
interface WorkflowTrigger {
  push?: {
    branches?: string[];
    tags?: string[];
    paths?: string[];
    pathsIgnore?: string[];
  };
  pull_request?: {
    branches?: string[];
    paths?: string[];
    pathsIgnore?: string[];
  };
  schedule?: Array<{
    cron: string;
  }>;
  workflow_dispatch?: {
    inputs?: Record<string, WorkflowInput>;
  };
  repository_dispatch?: {
    types?: string[];
  };
  // ... other trigger types
}
```

### JobConstruct

Creates and configures workflow jobs.

```typescript
class JobConstruct {
  constructor(
    workflow: WorkflowConstruct,
    id: string,
    props: JobProps
  );
}
```

#### JobProps

```typescript
interface JobProps {
  'runs-on': string | string[];
  needs?: string | string[];
  if?: string;
  steps: Step[];
  strategy?: StrategyConfig;
  env?: Record<string, string>;
  defaults?: JobDefaults;
  timeoutMinutes?: number;
  continueOnError?: boolean;
  container?: ContainerConfig;
  services?: Record<string, ServiceConfig>;
}
```

#### StrategyConfig

```typescript
interface StrategyConfig {
  matrix: Record<string, any[]>;
  failFast?: boolean;
  maxParallel?: number;
}
```

## Action Constructs

### Actions

Provides type-safe access to GitHub Actions.

```typescript
class Actions {
  constructor(stack: GitHubStack, id: string);
  
  // Generated methods for each action
  checkout(name: string, inputs?: CheckoutInputs): ActionConstruct;
  setupNode(name: string, inputs?: SetupNodeInputs): ActionConstruct;
  // ... other actions
}
```

### ActionConstruct

Base class for all action wrappers.

```typescript
class ActionConstruct {
  constructor(name: string, inputs?: Record<string, any>);
  
  toStep(): Step;
  withInputs(inputs: Record<string, any>): ActionConstruct;
}
```

### Step

Represents a workflow step.

```typescript
interface Step {
  name: string;
  uses?: string;
  with?: Record<string, any>;
  run?: string;
  shell?: string;
  env?: Record<string, string>;
  if?: string;
  continueOnError?: boolean;
  timeoutMinutes?: number;
}
```

## Utility Functions

### createStep

Creates a custom step.

```typescript
function createStep(
  name: string,
  run: string,
  options?: {
    shell?: string;
    env?: Record<string, string>;
    if?: string;
    continueOnError?: boolean;
    timeoutMinutes?: number;
  }
): Step;
```

### run

Creates a run step.

```typescript
function run(
  name: string,
  command: string,
  options?: {
    shell?: string;
    env?: Record<string, string>;
    if?: string;
    continueOnError?: boolean;
    timeoutMinutes?: number;
  }
): Step;
```

### SharedWorkflowConstruct

Creates reusable workflow definitions.

```typescript
class SharedWorkflowConstruct {
  constructor(
    stack: GitHubStack,
    id: string,
    props: SharedWorkflowProps
  );
}
```

#### SharedWorkflowProps

```typescript
interface SharedWorkflowProps {
  name: string;
  description?: string;
  inputs?: Record<string, WorkflowInput>;
  outputs?: Record<string, WorkflowOutput>;
  secrets?: Record<string, WorkflowSecret>;
  jobs: Record<string, JobDefinition>;
}
```

## Configuration Types

### DotGithubConfig

Main configuration interface.

```typescript
interface DotGithubConfig {
  version: string;
  rootDir: string;
  outputDir: string;
  actions: DotGithubAction[];
  plugins: PluginConfig[];
  stacks: StackConfig[];
  options?: DotGithubOptions;
  pins?: PinsConfig;
}
```

### DotGithubAction

Action configuration.

```typescript
interface DotGithubAction {
  orgRepo: string;
  ref: string;
  versionRef: string;
  actionName: string;
  outputPath: string;
  actionPath?: string;
  generateCode?: boolean;
}
```

### PluginConfig

Plugin configuration.

```typescript
interface PluginConfig {
  name: string;
  package: string;
  config: Record<string, any>;
  enabled: boolean;
}
```

### StackConfig

Stack configuration.

```typescript
interface StackConfig {
  name: string;
  plugins: string[];
  config: Record<string, any>;
}
```

### PinsConfig

Action pinning configuration.

```typescript
interface PinsConfig {
  plugins?: Record<string, Record<string, string>>;
  stacks?: Record<string, Record<string, string>>;
}
```

## Input/Output Types

### GitHubWorkflowInput

```typescript
interface GitHubWorkflowInput {
  description: string;
  required?: boolean;
  default?: string | number | boolean;
  type?: 'string' | 'number' | 'boolean';
}
```

### GitHubWorkflowOutput

```typescript
interface GitHubWorkflowOutput {
  description: string;
  value: string;
}
```

### GitHubWorkflowSecret

```typescript
interface GitHubWorkflowSecret {
  description: string;
  required?: boolean;
}
```

## Action Input Types

### CheckoutInputs

```typescript
interface CheckoutInputs {
  'repository'?: string;
  'ref'?: string;
  'token'?: string;
  'ssh-key'?: string;
  'ssh-known-hosts'?: string;
  'ssh-strict'?: boolean;
  'persist-credentials'?: boolean;
  'path'?: string;
  'clean'?: boolean;
  'fetch-depth'?: number;
  'lfs'?: boolean;
  'submodules'?: boolean | 'recursive';
  'set-safe-directory'?: boolean;
}
```

### SetupNodeInputs

```typescript
interface SetupNodeInputs {
  'node-version'?: string;
  'node-version-file'?: string;
  'cache'?: string;
  'cache-dependency-path'?: string;
  'check-latest'?: boolean;
  'always-auth'?: boolean;
  'registry-url'?: string;
  'scope'?: string;
  'token'?: string;
}
```

### SetupPythonInputs

```typescript
interface SetupPythonInputs {
  'python-version'?: string;
  'python-version-file'?: string;
  'cache'?: string;
  'cache-dependency-path'?: string;
  'token'?: string;
  'architecture'?: string;
  'update-environment'?: boolean;
}
```

## Error Handling

### ValidationError

Thrown when configuration validation fails.

```typescript
class ValidationError extends Error {
  constructor(message: string, details?: any);
}
```

### SynthesisError

Thrown when workflow synthesis fails.

```typescript
class SynthesisError extends Error {
  constructor(message: string, details?: any);
}
```

## Type Guards

### isDotGitHubPlugin

```typescript
function isDotGitHubPlugin(obj: any): obj is DotGitHubPlugin;
```

### isWorkflowConstruct

```typescript
function isWorkflowConstruct(obj: any): obj is WorkflowConstruct;
```

### isJobConstruct

```typescript
function isJobConstruct(obj: any): obj is JobConstruct;
```

## Constants

### Default Values

```typescript
const DEFAULT_NODE_VERSION = '18';
const DEFAULT_PYTHON_VERSION = '3.10';
const DEFAULT_RUNNER = 'ubuntu-latest';
```

### Supported Runners

```typescript
const SUPPORTED_RUNNERS = [
  'ubuntu-latest',
  'ubuntu-22.04',
  'ubuntu-20.04',
  'windows-latest',
  'windows-2022',
  'macos-latest',
  'macos-13',
  'macos-12'
];
```

## Examples

### Basic Plugin

```typescript
import { DotGitHubPlugin, GitHubStack, WorkflowConstruct, JobConstruct } from '@dotgithub/core';

export class BasicPlugin implements DotGitHubPlugin {
  readonly name = 'basic-plugin';
  readonly version = '1.0.0';
  readonly description = 'A basic plugin example';

  validate(stack: GitHubStack): void {
    // No validation needed
  }

  describe() {
    return {
      name: this.name,
      version: this.version,
      description: this.description
    };
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    const wf = new WorkflowConstruct(stack, 'ci', {
      name: 'CI Workflow',
      on: { push: { branches: ['main'] } },
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
          name: 'Run tests',
          run: 'npm test'
        }
      ]
    });
  }
}

export default new BasicPlugin();
```

### Advanced Plugin with Configuration

```typescript
import { z } from 'zod';
import { DotGitHubPlugin, GitHubStack, WorkflowConstruct, JobConstruct, Actions } from '@dotgithub/core';

export class AdvancedPlugin implements DotGitHubPlugin {
  readonly name = 'advanced-plugin';
  readonly version = '1.0.0';
  readonly description = 'An advanced plugin with configuration';

  private readonly configSchema = z.object({
    environment: z.enum(['development', 'staging', 'production']),
    nodeVersion: z.string().default('18'),
    testCommand: z.string().default('npm test'),
    deployCommand: z.string().default('npm run deploy')
  });

  validate(stack: GitHubStack): void {
    this.configSchema.parse(stack.config);
  }

  describe() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      configSchema: this.configSchema
    };
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    const config = this.configSchema.parse(stack.config);
    const { checkout, setupNode } = new Actions(stack, 'actions');

    const wf = new WorkflowConstruct(stack, 'ci', {
      name: 'CI/CD Workflow',
      on: { 
        push: { branches: ['main'] },
        pull_request: {}
      },
      jobs: {}
    });

    // Test job
    new JobConstruct(wf, 'test', {
      'runs-on': 'ubuntu-latest',
      steps: [
        checkout('Checkout code').toStep(),
        setupNode('Setup Node.js', {
          'node-version': config.nodeVersion
        }).toStep(),
        {
          name: 'Install dependencies',
          run: 'npm install'
        },
        {
          name: 'Run tests',
          run: config.testCommand
        }
      ]
    });

    // Deploy job (only on main branch)
    if (config.environment === 'production') {
      new JobConstruct(wf, 'deploy', {
        'runs-on': 'ubuntu-latest',
        needs: ['test'],
        if: "github.ref == 'refs/heads/main'",
        steps: [
          checkout('Checkout code').toStep(),
          setupNode('Setup Node.js', {
            'node-version': config.nodeVersion
          }).toStep(),
          {
            name: 'Deploy',
            run: config.deployCommand,
            env: {
              NODE_ENV: config.environment
            }
          }
        ]
      });
    }
  }
}

export default new AdvancedPlugin();
```
