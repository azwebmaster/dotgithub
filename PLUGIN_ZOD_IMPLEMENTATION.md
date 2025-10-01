# Plugin Configuration with Zod Implementation

This document describes the implementation of Zod-based plugin configuration validation and the new `describe` method for plugins.

## Overview

We've enhanced the plugin system with:
1. **Zod schemas** for comprehensive configuration validation
2. **Plugin description method** that provides metadata and configuration schemas
3. **Enhanced plugin manager** with validation and listing capabilities
4. **Utility functions** for plugin discovery and documentation generation

## Key Features

### 1. Zod Schema Validation

All plugin configurations are now validated using Zod schemas:

```typescript
// Plugin configuration schema
export const PluginConfigSchema = z.object({
  name: z.string()
    .min(1, 'Plugin name is required')
    .regex(/^[a-zA-Z0-9-_]+$/, { message: 'Plugin name must contain only alphanumeric characters, hyphens, and underscores' }),
  package: z.string()
    .min(1, 'Plugin package is required'),
  config: z.record(z.string(), z.any()).optional(),
  enabled: z.boolean().optional().default(true)
});
```

### 2. Plugin Description Method

Plugins can now implement an optional `describe()` method that returns comprehensive metadata:

```typescript
export abstract class DotGitHubPlugin {
  // ... existing properties ...
  
  /**
   * Optional method to describe the plugin including its configuration schema
   */
  describe?(): PluginDescription | Promise<PluginDescription>;
}
```

### 3. Plugin Description Schema

The `PluginDescription` type includes:

```typescript
export type PluginDescription = {
  name: string;
  version?: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  dependencies?: string[];
  conflicts?: string[];
  configSchema?: any; // Zod schema for plugin configuration
  configDescription?: string;
  examples?: Array<{
    name: string;
    description?: string;
    config: Record<string, any>;
  }>;
  tags?: string[];
  category?: string;
  minDotGithubVersion?: string;
  maxDotGithubVersion?: string;
};
```

## Usage Examples

### 1. Creating a Plugin with Description

```typescript
import { z } from 'zod';
import { DotGitHubPlugin, PluginContext, PluginDescription } from '@dotgithub/core';

export class ExamplePlugin implements DotGitHubPlugin {
  readonly name = 'example';
  readonly version = '1.0.0';
  readonly description = 'Example plugin for demonstrating functionality';

  private readonly configSchema = z.object({
    environment: z.string()
      .min(1, 'Environment is required')
      .describe('The environment to deploy to'),
    timeout: z.number()
      .min(1, 'Timeout must be at least 1 minute')
      .max(60, 'Timeout cannot exceed 60 minutes')
      .optional()
      .default(10)
      .describe('Job timeout in minutes'),
    nodeVersion: z.string()
      .regex(/^\d+\.\d+$/, { message: 'Node version must be in format X.Y' })
      .optional()
      .default('18.17')
      .describe('Node.js version to use')
  });

  describe(): PluginDescription {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'DotGitHub Team',
      repository: 'https://github.com/azwebmaster/dotgithub',
      license: 'MIT',
      keywords: ['example', 'ci', 'github-actions'],
      category: 'ci',
      configSchema: this.configSchema,
      configDescription: 'Configuration for the example plugin that sets up a basic CI workflow',
      examples: [
        {
          name: 'Basic CI',
          description: 'Simple CI workflow with default settings',
          config: {
            environment: 'production'
          }
        },
        {
          name: 'Extended CI',
          description: 'CI workflow with custom timeout and Node version',
          config: {
            environment: 'staging',
            timeout: 30,
            nodeVersion: '20.5'
          }
        }
      ],
      tags: ['ci', 'testing', 'automation'],
      minDotGithubVersion: '1.0.0'
    };
  }

  validate(context: PluginContext): void {
    this.configSchema.parse(context.config);
  }

  async apply(context: PluginContext): Promise<void> {
    const validatedConfig = this.configSchema.parse(context.config);
    // Use validatedConfig in your plugin logic
  }
}
```

### 2. Using the Plugin Manager

```typescript
import { PluginManager } from '@dotgithub/core';

const manager = new PluginManager({
  projectRoot: process.cwd()
});

// Load plugins with validation
const pluginConfigs = [
  {
    name: 'example',
    package: './example-plugin',
    config: {
      environment: 'production',
      timeout: 15,
      nodeVersion: '18.17'
    },
    enabled: true
  }
];

const loadResults = await manager.loadPlugins(pluginConfigs);

// List all plugins with descriptions
const pluginList = await manager.listPlugins();
for (const { name, description } of pluginList) {
  console.log(`Plugin: ${name}`);
  if (description) {
    console.log(formatPluginDescription(description));
  }
}

// Get specific plugin description
const description = await manager.describePlugin('example');

// Get configuration schema
const schema = await manager.getPluginConfigSchema('example');

// Validate configuration against plugin's schema
const validation = await manager.validatePluginConfigAgainstSchema('example', {
  environment: 'staging',
  timeout: 30
});
```

### 3. Utility Functions

```typescript
import { 
  formatPluginDescription, 
  generatePluginMarkdown,
  searchPluginsByKeyword,
  filterPluginsByCategory 
} from '@dotgithub/core';

// Format plugin description for display
const formatted = formatPluginDescription(pluginDescription);

// Generate markdown documentation
const markdown = generatePluginMarkdown(pluginDescription);

// Search plugins by keyword
const searchResults = searchPluginsByKeyword(descriptions, 'ci');

// Filter by category
const ciPlugins = filterPluginsByCategory(descriptions, 'ci');
```

## Benefits

1. **Type Safety**: Zod schemas provide compile-time and runtime type safety
2. **Validation**: Comprehensive validation with detailed error messages
3. **Documentation**: Self-documenting plugins with examples and descriptions
4. **Discovery**: Easy plugin discovery and listing capabilities
5. **Extensibility**: Rich metadata system for plugin categorization and search
6. **Developer Experience**: Better error messages and configuration guidance

## Migration Guide

### For Existing Plugins

1. **Add Zod dependency** (if not already present):
   ```bash
   bun add zod
   ```

2. **Implement describe method** (optional but recommended):
   ```typescript
   describe(): PluginDescription {
     return {
       name: this.name,
       version: this.version,
       description: this.description,
       // ... other metadata
     };
   }
   ```

3. **Add configuration schema** (optional but recommended):
   ```typescript
   private readonly configSchema = z.object({
     // Define your configuration schema
   });
   ```

4. **Update validation** to use Zod schema:
   ```typescript
   validate(context: PluginContext): void {
     this.configSchema.parse(context.config);
   }
   ```

### For Plugin Consumers

The plugin manager now automatically validates configurations, so existing code should work without changes. However, you can now take advantage of the new features:

- Use `manager.listPlugins()` to discover available plugins
- Use `manager.describePlugin()` to get plugin information
- Use `manager.validatePluginConfigAgainstSchema()` for additional validation

## Files Modified

- `packages/core/src/plugins/schemas.ts` - New Zod schemas and validation functions
- `packages/core/src/plugins/types.ts` - Updated plugin interface with describe method
- `packages/core/src/plugins/manager.ts` - Enhanced with validation and listing capabilities
- `packages/core/src/plugins/utils.ts` - New utility functions for plugin management
- `packages/core/src/plugins/index.ts` - Export new functionality
- `example/src/index.ts` - Updated example plugin to demonstrate new features

## Testing

The implementation includes comprehensive validation and error handling. All schemas are tested and the build passes successfully. The example plugin demonstrates the full functionality including:

- Configuration schema definition
- Plugin description with examples
- Validation against schema
- Markdown documentation generation
