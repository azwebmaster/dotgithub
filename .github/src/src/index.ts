// GitHub Actions workspace entry point
import {
  GitHubConstruct,
  GitHubStack,
  JobConstruct,
  WorkflowConstruct,
  ActionsHelper,
} from '@dotgithub/core';
import type {
  ConstructDescription,
  GitHubWorkflowInput,
} from '@dotgithub/core';
import { z } from 'zod';
import { Actions } from './actions/index.js';

export type MyConstructInputs = {
  /**
   * Environment to deploy to
   */
  environment: GitHubWorkflowInput;
};

export class MyConstruct extends GitHubConstruct {
  readonly name = 'my-construct';
  readonly version = '1.0.0';
  readonly description = 'My custom GitHub Actions construct';

  private readonly configSchema = z.object({
    environment: z
      .string()
      .min(1, 'Environment is required')
      .describe('The environment to deploy to (e.g., production, staging)'),
    timeout: z
      .number()
      .min(1, 'Timeout must be at least 1 minute')
      .max(60, 'Timeout cannot exceed 60 minutes')
      .optional()
      .default(10)
      .describe('Job timeout in minutes'),
  });

  validate(stack: GitHubStack): void {
    this.configSchema.parse(stack.config);
  }

  describe(): ConstructDescription {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'Your Name',
      repository: 'https://github.com/your-org/your-repo',
      license: 'MIT',
      keywords: ['ci', 'github-actions'],
      category: 'ci',
      configSchema: this.configSchema,
      tags: ['ci', 'automation'],
      minDotGithubVersion: '2.0.0',
    };
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    const { config } = stack;

    // Parse and validate config using the schema
    const validatedConfig = this.configSchema.parse(config);

    const { run } = new ActionsHelper(stack);

    // Create a workflow
    const workflow = new WorkflowConstruct(stack, 'ci', {
      name: 'CI Workflow',
      on: {
        push: {
          branches: ['main'],
        },
        pull_request: {},
      },
      jobs: {},
    });

    const actions = new Actions(stack, 'actions');

    // Create a job
    new JobConstruct(workflow, 'test', {
      name: 'Test',
      'runs-on': 'ubuntu-latest',
      steps: [
        actions.checkout('Checkout code').toStep(),
        run('Hello World', 'echo "Hello from my construct!"').toStep(),
        run('Show Environment', `echo "Environment: ${validatedConfig.environment}"`).toStep(),
      ],
    });
  }
}

export default new MyConstruct();
