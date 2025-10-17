// GitHub Actions workspace entry point
import {
  ActionInvocationResult,
  createStep,
  DotGitHubPlugin,
  GitHubStack,
  JobConstruct,
  RunStep,
  SharedWorkflowConstruct,
  WorkflowConstruct,
  Steps,
  GitHubOutputValue,
  ActionsHelper,
} from '@dotgithub/core';
import type {
  GitHubJob,
  PluginDescription,
  GitHubWorkflowInput,
  GitHubWorkflowInputs,
  GitHubStepAny,
  GitHubSteps,
} from '@dotgithub/core';
import { z } from 'zod';
import { Actions } from './actions/index.js';
export type TestInputs = {
  /**
   * Test input
   */
  testInput: GitHubWorkflowInput;
};

export class ExamplePlugin implements DotGitHubPlugin {
  readonly name = 'example';
  readonly version = '1.0.0';
  readonly description =
    'Example plugin for demonstrating plugin functionality';

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
    nodeVersion: z
      .string()
      .regex(/^\d+\.\d+$/, 'Node version must be in format X.Y (e.g., 18.17)')
      .optional()
      .default('18.17')
      .describe('Node.js version to use'),
  });

  validate(stack: GitHubStack): void {
    this.configSchema.parse(stack.config);
  }

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
      tags: ['ci', 'testing', 'automation'],
      minDotGithubVersion: '2.0.0',
    };
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    const { config } = stack;

    // Parse and validate config using the schema
    const validatedConfig = this.configSchema.parse(config);

    const {
      checkout,
      setupNode,
      cache,
      setupPython,
      uploadABuildArtifact,
      mergeBuildArtifacts,
    } = new Actions(stack, 'actions');

    const { invokeAction, run } = new ActionsHelper(stack);

    const wf = new WorkflowConstruct(stack, 'ci', {
      name: 'CI Workflow',
      on: {
        push: {
          branches: ['main'],
        },
        pull_request: {},
      },
      jobs: {},
    });

    const sharedWf = new SharedWorkflowConstruct(
      stack,
      'shared-workflow',
      {
        name: {
          description: 'The name of the project',
          required: true,
          default: 'My Project',
        },
      },
      {
        name: 'Shared Workflow',
        jobs: {},
      }
    );

    new JobConstruct(sharedWf, 'test2', {
      name: 'Test2',
      'runs-on': 'ubuntu-latest',
      steps: [
        checkout('Checkout', {
          'fetch-depth': 1,
        }).toStep(),
      ],
    });

    new JobConstruct(
      wf,
      'test',
      sharedWf.call({
        name: 'Test',
      })
    );

    const job = new JobConstruct(wf, 'build', {
      name: 'Build',
      'runs-on': 'ubuntu-latest',
      steps: [
        checkout('Checkout', {
          'fetch-depth': 1,
        }).toStep(),
        run('Build', 'npm run build').toStep(),
      ],
    });
  }
}

export default new ExamplePlugin();
