# Example Generated Plugin Structure

This document shows how the plugin generation now wraps workflow and resource files in functions that accept a `PluginContext` parameter.

## Before (Old Structure)

### Workflow File (`workflows/ci.ts`)
```typescript
import type { GitHubWorkflow } from '@dotgithub/core';

/**
 * ci workflow
 * Generated from: workflows/ci.yml
 */
export const CiWorkflow: GitHubWorkflow = {
  name: "CI",
  on: { push: { branches: ["main"] } },
  jobs: {
    test: {
      "runs-on": "ubuntu-latest",
      steps: [
        { uses: "actions/checkout@v4" },
        { name: "Run tests", run: "npm test" }
      ]
    }
  }
};
```

### Resource File (`resources/dependabot.ts`)
```typescript
/**
 * dependabot resource
 * Generated from: dependabot.yml
 */
export const DependabotResource = {
  path: 'dependabot.yml',
  content: {
    version: 2,
    updates: [
      {
        "package-ecosystem": "npm",
        directory: "/",
        schedule: { interval: "weekly" }
      }
    ]
  }
};
```

### Plugin Index File (`index.ts`)
```typescript
import { CiWorkflow } from './workflows/ci';
import { DependabotResource } from './resources/dependabot';

export class MyPlugin implements DotGitHubPlugin {
  readonly name = 'my-plugin';
  readonly version = '1.0.0';
  readonly description = 'Test plugin for function-based structure';

  async applyWorkflows(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    stack.addWorkflow('ci', CiWorkflow(context));
  }

  async applyResources(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    stack.addResource('dependabot.yml', { content: DependabotResource(context).content });
  }

  async apply(context: PluginContext): Promise<void> {
    await this.applyWorkflows(context);
    await this.applyResources(context);
  }
}

// Export as default for easier importing
export default new MyPlugin();
```

## After (New Structure)

### Workflow File (`workflows/ci.ts`)
```typescript
import type { GitHubWorkflow, PluginContext } from '@dotgithub/core';

/**
 * ci workflow
 * Generated from: workflows/ci.yml
 */
export function CiWorkflow(context: PluginContext): GitHubWorkflow {
  return {
    name: "CI",
    on: { push: { branches: ["main"] } },
    jobs: {
      test: {
        "runs-on": "ubuntu-latest",
        steps: [
          { uses: "actions/checkout@v4" },
          { name: "Run tests", run: "npm test" }
        ]
      }
    }
  };
}
```

### Resource File (`resources/dependabot.ts`)
```typescript
import type { PluginContext } from '@dotgithub/core';

/**
 * dependabot resource
 * Generated from: dependabot.yml
 */
export function DependabotResource(context: PluginContext) {
  return {
    path: 'dependabot.yml',
    content: {
      version: 2,
      updates: [
        {
          "package-ecosystem": "npm",
          directory: "/",
          schedule: { interval: "weekly" }
        }
      ]
    }
  };
}
```

### Plugin Index File (`index.ts`)
```typescript
import { CiWorkflow } from './workflows/ci';
import { DependabotResource } from './resources/dependabot';

export class MyPlugin implements DotGitHubPlugin {
  readonly name = 'my-plugin';
  readonly version = '1.0.0';
  readonly description = 'Test plugin for function-based structure';

  async applyWorkflows(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    stack.addWorkflow('ci', CiWorkflow(context));
  }

  async applyResources(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    stack.addResource('dependabot.yml', { content: DependabotResource(context).content });
  }

  async apply(context: PluginContext): Promise<void> {
    await this.applyWorkflows(context);
    await this.applyResources(context);
  }
}

// Export as default for easier importing
export default new MyPlugin();
```

## Benefits of the New Structure

1. **Context Access**: Workflow and resource functions now have access to the `PluginContext`, allowing them to:
   - Access configuration values
   - Use the stack for dynamic resource generation
   - Access other plugins or dependencies
   - Make runtime decisions based on context

2. **Dynamic Generation**: Resources and workflows can now be generated dynamically based on the context, rather than being static exports.

3. **Better Encapsulation**: Each workflow and resource function is self-contained and receives the context it needs to operate.

4. **Future Extensibility**: This structure makes it easier to add features like conditional workflow generation, context-aware resource creation, and plugin composition.
