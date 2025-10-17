import { run as createRunStep } from '../actions.js';
import { StepChainBuilder } from '../plugins/actions-helper.js';
import { GitHubOutputValue } from '../plugins/index.js';
import type { GitHubStepRun, GitHubStepAny, GitHubSteps } from '../types/workflow.js';

/**
 * A utility class for creating basic reusable GitHub Actions steps
 */
export class Steps {
  
  /**
   * Creates a run step with the specified name and script
   * @param name - The name of the step
   * @param script - The shell script to execute
   * @param step - Additional step configuration options
   * @returns A GitHub run step
   */
  static run(name: string, script: string, step?: Partial<Omit<GitHubStepRun, "run" | "name">>): GitHubStepRun {
    return createRunStep(name, script, step);
  }

  /**
   * Creates a step chain builder for chaining multiple steps with access to outputs
   * @param step - The first step in the chain
   * @param outputs - Optional outputs from the initial step
   * @returns A StepChainBuilder instance for further chaining
   */
  static chain<TOutputs>(step: GitHubStepAny, outputs?: TOutputs): StepChainBuilder<TOutputs> {
    return new StepChainBuilder<TOutputs>(step, outputs || {} as TOutputs);
  }

  /**
   * Creates a step chain starting with a run step
   * @param name - The name of the initial run step
   * @param script - The shell script to execute
   * @param step - Additional step configuration options
   * @param outputs - Optional outputs from the run step
   * @returns A StepChainBuilder instance for further chaining
   */
  static runChain<TOutputs>(
    name: string, 
    script: string, 
    step?: Partial<Omit<GitHubStepRun, "run" | "name">>,
    outputs?: TOutputs
  ): StepChainBuilder<TOutputs> {
    const runStep = this.run(name, script, step);
    return this.chain<TOutputs>(runStep, outputs);
  }
}
