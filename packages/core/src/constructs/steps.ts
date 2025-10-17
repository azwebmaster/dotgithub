import { RunStep } from '../actions.js';
import { StepChainBuilder } from '../plugins/actions-helper.js';
import { GitHubOutputValue } from '../plugins/index.js';
import type {
  GitHubStepRun,
  GitHubStepAny,
  GitHubSteps,
} from '../types/workflow.js';

/**
 * A utility class for creating basic reusable GitHub Actions steps
 */
export class Steps {
  /**
   * Creates a run step with the specified name and script
   * @param name - The name of the step
   * @param script - The shell script to execute
   * @param step - Additional step configuration options
   * @returns A RunStep instance that provides toStep() and then() methods
   */
  static run<TOutputs = Record<string, GitHubOutputValue>>(
    name: string,
    script: string,
    step?: Partial<Omit<GitHubStepRun, 'run' | 'name'>>,
    outputs?: TOutputs
  ): RunStep<TOutputs> {
    return new RunStep<TOutputs>(name, script, step, outputs);
  }

  /**
   * Creates a step chain builder for chaining multiple steps with access to outputs
   * @param step - The first step in the chain
   * @param outputs - Optional outputs from the initial step
   * @returns A StepChainBuilder instance for further chaining
   */
  static chain<TOutputs>(
    step: GitHubStepAny,
    outputs?: TOutputs
  ): StepChainBuilder<TOutputs> {
    return new StepChainBuilder<TOutputs>(step, outputs || ({} as TOutputs));
  }
}
