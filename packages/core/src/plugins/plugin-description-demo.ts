/**
 * Demo script showing how to use the construct description functionality
 */

import { ConstructManager } from './manager.js';
import {
  formatConstructDescription,
  generateConstructMarkdown,
} from './utils.js';
import type { ConstructConfig } from './schemas.js';

// Example usage of the construct description system
export async function demonstrateConstructDescription() {
  const manager = new ConstructManager({
    projectRoot: process.cwd(),
  });

  const constructConfigs: ConstructConfig[] = [
    {
      name: 'example',
      package: './example-construct',
      config: {
        environment: 'production',
        timeout: 15,
        nodeVersion: '18.17',
      },
      enabled: true,
    },
  ];

  try {
    const loadResults = await manager.loadConstructs(constructConfigs);
    console.log(
      'Loaded constructs:',
      loadResults.map((r: { config: ConstructConfig }) => r.config.name)
    );

    const constructList = await manager.listConstructs();
    console.log('\n=== Construct List ===');
    for (const { name, description } of constructList) {
      console.log(`\nConstruct: ${name}`);
      if (description) {
        console.log(formatConstructDescription(description));
      } else {
        console.log('No description available');
      }
    }

    const exampleDescription = await manager.describeConstruct('example');
    if (exampleDescription) {
      console.log('\n=== Example Construct Description ===');
      console.log(formatConstructDescription(exampleDescription));

      console.log('\n=== Markdown Documentation ===');
      console.log(generateConstructMarkdown(exampleDescription));
    }

    const configSchema = await manager.getConstructConfigSchema('example');
    if (configSchema) {
      console.log('\n=== Configuration Schema ===');
      console.log('Schema available for validation');
    }

    const validationResult =
      await manager.validateConstructConfigAgainstSchema('example', {
        environment: 'staging',
        timeout: 30,
        nodeVersion: '20.5',
      });

    if (validationResult.success) {
      console.log('\n=== Configuration Validation ===');
      console.log('Configuration is valid:', validationResult.data);
    } else {
      console.log('\n=== Configuration Validation Error ===');
      console.log('Error:', validationResult.error);
    }
  } catch (error) {
    console.error('Error demonstrating construct description:', error);
  }
}

// Example of how to create a construct with the describe method
export class DemoConstruct {
  readonly name = 'demo';
  readonly version = '1.0.0';
  readonly description = 'A demo construct showing the describe functionality';

  private readonly configSchema = {
    parse: (config: any) => {
      if (!config.message) {
        throw new Error('Message is required');
      }
      return config;
    },
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
      configDescription: 'Configuration for the demo construct',
      examples: [
        {
          name: 'Basic Demo',
          description: 'Simple demo configuration',
          config: {
            message: 'Hello World',
          },
        },
      ],
      tags: ['demo', 'example'],
      minDotGithubVersion: '1.0.0',
    };
  }

  validate(context: any): void {
    this.configSchema.parse(context.config);
  }

  synthesize(stack: any): void {
    console.log('Demo construct synthesized with config:', stack.config);
  }
}
