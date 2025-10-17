import type {
  GitHubStep,
  GitHubStepWith,
  GitHubStepRun,
  GitHubStepAny,
  GitHubSteps,
} from './types/workflow';
import type { DotGithubConfig, DotGithubAction } from './config';
import { dedent } from './utils.js';
import type { GitHubStack } from './constructs/base';
import {
  ActionInvocationResult,
  GitHubOutputValue,
} from './plugins/action-collection.js';

/**
 * A class that wraps a run step and provides methods for chaining and output access
 */
export class RunStep<TOutputs = Record<string, GitHubOutputValue>> {
  private readonly _step: GitHubStepRun;
  private readonly _outputs: TOutputs;

  constructor(
    name: string,
    script: string,
    step?: Partial<Omit<GitHubStepRun, 'run' | 'name'>>,
    outputs?: TOutputs
  ) {
    this._step = {
      name,
      run: dedent(script).trim(),
      ...step,
    };
    this._outputs = outputs || ({} as TOutputs);
  }

  /**
   * Converts the run step to a GitHub step configuration
   * @returns A GitHub run step configuration
   */
  toStep(): GitHubStepRun {
    return this._step;
  }

  /**
   * Creates an ActionInvocationResult that provides access to outputs and allows chaining additional steps
   * @param stepFactory Optional function that receives the outputs from this run step and returns a new step
   * @returns An ActionInvocationResult with the current step and outputs, plus any chained steps
   */
  then(
    stepFactory?: (outputs: TOutputs) => GitHubStepAny
  ): ActionInvocationResult<TOutputs> {
    const step = this.toStep();
    const steps: GitHubSteps = [step];

    // Create outputs with proper step ID references
    const outputs = this.createOutputs(step.id || 'run-step', this._outputs);

    const result = new ActionInvocationResult(steps, outputs);

    // If a step factory is provided, chain the additional step
    if (stepFactory) {
      return result.then(stepFactory);
    }

    return result;
  }

  /**
   * Creates outputs with proper step ID references
   */
  private createOutputs(stepId: string, outputs: TOutputs): TOutputs {
    const result = {} as TOutputs;
    for (const [key, output] of Object.entries(outputs as any)) {
      if (output instanceof GitHubOutputValue) {
        // Create a new GitHubOutputValue with the step-specific path
        (result as any)[key] = new GitHubOutputValue(
          `step.${stepId}.outputs.${key}`
        );
      } else {
        // If it's not a GitHubOutputValue, create one
        (result as any)[key] = new GitHubOutputValue(
          `step.${stepId}.outputs.${key}`
        );
      }
    }
    return result;
  }
}

/**
 * Creates a GitHub Action step with version resolution from config
 * @param uses - The action to use (e.g., "actions/checkout")
 * @param step - Additional step configuration
 * @param ref - Optional ref override
 * @param stack - Optional GitHub stack to look up action ref overrides
 * @returns A GitHub step configuration
 */
export function createStep<T extends GitHubStepWith>(
  uses: string,
  step?: Partial<Omit<GitHubStep<T>, 'uses'>>,
  ref?: string,
  stack?: GitHubStack,
  fallbackRef?: string
): GitHubStep<T> {
  let version: string | undefined;

  // Priority order: 1. Stack config (highest), 2. Plugin config, 3. Action function ref, 4. Hardcoded ref
  if (stack) {
    // Check for action overrides in the merged config (stack config takes priority over plugin config)
    const actionOverride = stack.config?.actions?.[uses];
    if (actionOverride) {
      version = actionOverride;
    }
  }

  // If no config override found, use explicit ref parameter (action function ref)
  if (!version && ref) {
    version = ref;
  }

  // Fallback to provided fallback ref (hardcoded ref), then 'latest' if no version found
  version = version || fallbackRef || 'latest';

  const newStep: GitHubStep<T> = {
    uses: `${uses}@${version}`,
    ...step,
  };
  return newStep;
}

/**
 * Finds an action in the config by org/repo
 * @param uses - The action to find (e.g., "actions/checkout")
 * @param config - The config to search in
 * @returns The action configuration or undefined if not found
 */
function findActionInConfig(
  uses: string,
  config: DotGithubConfig
): DotGithubAction | undefined {
  return config.actions.find((action) => action.orgRepo === uses);
}
