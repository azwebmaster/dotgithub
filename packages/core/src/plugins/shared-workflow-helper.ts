import { SharedWorkflowConstruct } from '../constructs/shared-workflow.js';
import type { GitHubStack } from '../constructs/base.js';
import type {
  GitHubWorkflowInputs,
  GitHubReusableWorkflow,
  GitHubJob,
  GitHubJobWith,
} from '../types/workflow.js';
import type { GitHubInputValue } from '../types/common.js';

/**
 * Helper class for creating shared workflows in plugins.
 * Provides a convenient API for defining reusable workflows with typed inputs.
 */
export class SharedWorkflowHelper {
  private readonly _stack: GitHubStack;

  constructor(stack: GitHubStack) {
    this._stack = stack;
  }

  /**
   * Creates a shared workflow with typed inputs.
   * @param id - Unique identifier for the shared workflow
   * @param inputs - Input parameter definitions
   * @param workflow - The workflow definition (without 'on' trigger)
   * @returns A SharedWorkflowConstruct that can be called from other workflows
   */
  create<T extends GitHubWorkflowInputs>(
    id: string,
    inputs: T,
    workflow: Omit<GitHubReusableWorkflow, 'on'>
  ): SharedWorkflowConstruct<T> {
    return new SharedWorkflowConstruct<T>(this._stack, id, inputs, workflow);
  }

  /**
   * Creates a simple shared workflow for common use cases like testing or building.
   * @param id - Unique identifier for the shared workflow
   * @param inputs - Input parameter definitions
   * @param jobConfig - The job configuration to run
   * @returns A SharedWorkflowConstruct that can be called from other workflows
   */
  createSimple<T extends GitHubWorkflowInputs>(
    id: string,
    inputs: T,
    jobConfig: {
      name?: string;
      'runs-on'?: string | string[];
      steps: any[];
      outputs?: Record<string, string>;
      env?: Record<string, string>;
      permissions?: any;
    }
  ): SharedWorkflowConstruct<T> {
    const workflow: Omit<GitHubReusableWorkflow, 'on'> = {
      name: jobConfig.name || id,
      jobs: {
        [id]: {
          'runs-on': jobConfig['runs-on'] || 'ubuntu-latest',
          steps: jobConfig.steps,
          outputs: jobConfig.outputs,
          env: jobConfig.env,
          permissions: jobConfig.permissions,
        },
      },
    };

    return this.create(id, inputs, workflow);
  }

  /**
   * Creates a shared workflow for Node.js projects with common testing patterns.
   * @param id - Unique identifier for the shared workflow
   * @param inputs - Input parameter definitions (should include nodeVersion, testCommand, etc.)
   * @param customSteps - Additional steps to run after the standard Node.js setup
   * @returns A SharedWorkflowConstruct for Node.js testing
   */
  createNodeTest<T extends GitHubWorkflowInputs>(
    id: string,
    inputs: T,
    customSteps: any[] = []
  ): SharedWorkflowConstruct<T> {
    const defaultSteps = [
      {
        name: 'Checkout',
        uses: 'actions/checkout@v4',
      },
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '${{ inputs.nodeVersion || "20" }}',
          cache: 'npm',
        },
      },
      {
        name: 'Install dependencies',
        run: '${{ inputs.installCommand || "npm ci" }}',
      },
    ];

    const steps = [
      ...defaultSteps,
      ...customSteps,
      {
        name: 'Run tests',
        run: '${{ inputs.testCommand || "npm test" }}',
      },
    ];

    return this.createSimple(id, inputs, {
      name: `Node.js Test - ${id}`,
      'runs-on': '${{ inputs.runsOn || "ubuntu-latest" }}',
      steps,
    });
  }

  /**
   * Creates a shared workflow for building and publishing packages.
   * @param id - Unique identifier for the shared workflow
   * @param inputs - Input parameter definitions
   * @param customSteps - Additional steps to run during the build process
   * @returns A SharedWorkflowConstruct for building and publishing
   */
  createBuildPublish<T extends GitHubWorkflowInputs>(
    id: string,
    inputs: T,
    customSteps: any[] = []
  ): SharedWorkflowConstruct<T> {
    const defaultSteps = [
      {
        name: 'Checkout',
        uses: 'actions/checkout@v4',
      },
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '${{ inputs.nodeVersion || "20" }}',
          cache: 'npm',
          'registry-url':
            '${{ inputs.registryUrl || "https://registry.npmjs.org/" }}',
        },
      },
      {
        name: 'Install dependencies',
        run: '${{ inputs.installCommand || "npm ci" }}',
      },
    ];

    const steps = [
      ...defaultSteps,
      ...customSteps,
      {
        name: 'Build',
        run: '${{ inputs.buildCommand || "npm run build" }}',
      },
      {
        name: 'Publish',
        if: '${{ inputs.publishCondition || "github.ref == \'refs/heads/main\'" }}',
        run: '${{ inputs.publishCommand || "npm publish" }}',
        env: {
          NODE_AUTH_TOKEN: '${{ inputs.npmToken || secrets.NPM_TOKEN }}',
        },
      },
    ];

    return this.createSimple(id, inputs, {
      name: `Build and Publish - ${id}`,
      'runs-on': '${{ inputs.runsOn || "ubuntu-latest" }}',
      steps,
    });
  }
}
