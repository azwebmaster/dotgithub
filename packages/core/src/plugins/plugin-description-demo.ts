/**
 * Demo script showing how to use the new plugin description functionality
 */

import { PluginManager } from './manager.js';
import { formatPluginDescription, generatePluginMarkdown } from './utils.js';
import type { PluginConfig } from './schemas.js';

// Example usage of the new plugin description system
export async function demonstratePluginDescription() {
  // Create a plugin manager
  const manager = new PluginManager({
    projectRoot: process.cwd()
  });

  // Example plugin configurations
  const pluginConfigs: PluginConfig[] = [
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

  try {
    // Load plugins
    const loadResults = await manager.loadPlugins(pluginConfigs);
    console.log('Loaded plugins:', loadResults.map(r => r.config.name));

    // List all plugins with their descriptions
    const pluginList = await manager.listPlugins();
    console.log('\n=== Plugin List ===');
    for (const { name, description } of pluginList) {
      console.log(`\nPlugin: ${name}`);
      if (description) {
        console.log(formatPluginDescription(description));
      } else {
        console.log('No description available');
      }
    }

    // Get specific plugin description
    const exampleDescription = await manager.describePlugin('example');
    if (exampleDescription) {
      console.log('\n=== Example Plugin Description ===');
      console.log(formatPluginDescription(exampleDescription));
      
      console.log('\n=== Markdown Documentation ===');
      console.log(generatePluginMarkdown(exampleDescription));
    }

    // Get configuration schema for a plugin
    const configSchema = await manager.getPluginConfigSchema('example');
    if (configSchema) {
      console.log('\n=== Configuration Schema ===');
      console.log('Schema available for validation');
    }

    // Validate plugin configuration against its schema
    const validationResult = await manager.validatePluginConfigAgainstSchema('example', {
      environment: 'staging',
      timeout: 30,
      nodeVersion: '20.5'
    });

    if (validationResult.success) {
      console.log('\n=== Configuration Validation ===');
      console.log('Configuration is valid:', validationResult.data);
    } else {
      console.log('\n=== Configuration Validation Error ===');
      console.log('Error:', validationResult.error);
    }

  } catch (error) {
    console.error('Error demonstrating plugin description:', error);
  }
}

// Example of how to create a plugin with the describe method
export class DemoPlugin {
  readonly name = 'demo';
  readonly version = '1.0.0';
  readonly description = 'A demo plugin showing the describe functionality';

  private readonly configSchema = {
    parse: (config: any) => {
      if (!config.message) {
        throw new Error('Message is required');
      }
      return config;
    }
  };

  describe() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'Demo Author',
      license: 'MIT',
      category: 'demo',
      configSchema: this.configSchema,
      configDescription: 'Configuration for the demo plugin',
      examples: [
        {
          name: 'Basic Demo',
          description: 'Simple demo configuration',
          config: {
            message: 'Hello World'
          }
        }
      ],
      tags: ['demo', 'example'],
      minDotGithubVersion: '1.0.0'
    };
  }

  validate(context: any): void {
    this.configSchema.parse(context.config);
  }

  synthesize(context: any): void {
    console.log('Demo plugin synthesized with config:', context.config);
  }
}
