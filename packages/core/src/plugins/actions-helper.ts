import { createStep, run } from '../actions.js';
import type { GitHubStack } from '../constructs/base.js';
import type { GitHubStep, GitHubStepWith, GitHubStepRun, GitHubSteps, GitHubStepAny } from '../types/workflow.js';
import { GitHubOutputValue } from './index.js';

/**
 * Builder class for creating step chains with output handling
 */
export class StepChainBuilder<TOutputs = any> {
  private _steps: GitHubSteps = [];
  private _outputs: TOutputs;
  private _initialStep: GitHubStepAny;

  constructor(initialStep: GitHubStepAny, outputs: TOutputs) {
    this._initialStep = initialStep;
    this._steps.push(initialStep);
    this._outputs = outputs;
  }

  /**
   * Creates outputs with proper step ID references
   */
  private createOutputs<TOutputs>(stepId: string, outputs: TOutputs): TOutputs {
    const result = {} as TOutputs;
    
    for (const [key, output] of Object.entries(outputs as any)) {
      if (output instanceof GitHubOutputValue) {
        // Create a new GitHubOutputValue with the step-specific path
        const newOutput = new GitHubOutputValue(`step.${stepId}.outputs.${key}`);
        (result as any)[key] = newOutput;
      } else {
        // Preserve non-GitHubOutputValue outputs as-is
        (result as any)[key] = output;
      }
    }
    
    return result;
  }

  /**
   * Adds a step to the chain and provides access to outputs from the previous step
   * @param stepFactory Function that receives outputs from the previous step and returns a new step
   * @returns A new StepChainBuilder for further chaining
   */
  then(
    stepFactory: (outputs: TOutputs) => GitHubStepAny
  ): StepChainBuilder<TOutputs> {
    const newStep = stepFactory(this.outputs);
    this._steps.push(newStep);
    return this;
  }

  withId(id: string): StepChainBuilder<TOutputs> {
    this._initialStep.id = id;
    return this;
  }


  /**
   * Finalizes the step chain and returns all steps
   * @returns Array of all steps in the chain
   */
  steps(): GitHubSteps {
    return [...this._steps];
  }

  /**
   * Outputs from the initial step.
   * @returns Outputs instance.
   */
  get outputs(): TOutputs {
    return this.createOutputs(this._initialStep.id ?? '' , this._outputs);
  }

  /**
   * Spread operator support - returns all steps
   */
  [Symbol.iterator]() {
    return this._steps[Symbol.iterator]();
  }

  /**
   * Returns the number of steps in the chain
   */
  get length(): number {
    return this.steps.length;
  }

  /**
   * Returns the last step in the chain
   */
  get lastStep(): GitHubStepAny | undefined {
    const stepsArray = this.steps();
    return stepsArray[stepsArray.length - 1];
  }
}

/**
 * Actions helper for plugins that provides convenient methods for creating GitHub Action steps
 */
export class ActionsHelper {
  private readonly stack: GitHubStack;

  constructor(stack: GitHubStack) {
    this.stack = stack;
  }

  /**
   * Creates a run step for executing shell commands
   * @param name - The name of the step
   * @param script - The shell script to execute
   * @param step - Additional step configuration
   * @returns A GitHub run step
   */
  run<T extends Partial<Omit<GitHubStepRun, "run" | "name">>>(
    name: string,
    script: string, 
    step?: T
  ): GitHubStepRun {
    return run(name, script, step);
  }

  /**
   * Invokes a GitHub Action by resolving the correct ref from config and creating a step
   * @param uses - The action to use (e.g., "actions/checkout")
   * @param inputs - Input parameters for the action
   * @param step - Additional step configuration
   * @param ref - Optional ref override (takes precedence over config)
   * @returns A GitHub action step
   */
  invokeAction<T extends GitHubStepWith>(
    uses: string,
    inputs?: T,
    step?: Partial<Omit<GitHubStep<T>, "uses">>,
    ref?: string
  ): GitHubStep<T> {
    return createStep(uses, {
      with: inputs,
      ...step
    }, ref, this.stack);
  }

  /**
   * Finds an action in the config by org/repo
   * @param uses - The action to find (e.g., "actions/checkout")
   * @returns The action configuration or undefined if not found
   */
  findAction(uses: string) {
    // First check for action overrides in the merged config
    const actionOverride = this.stack.config?.actions?.[uses];
    if (actionOverride) {
      return { orgRepo: uses, ref: actionOverride };
    }
    
    // Fallback to looking up in the actions array (if it exists)
    return this.stack.config?.actions?.find((action: any) => action.orgRepo === uses);
  }

  /**
   * Gets the resolved ref for an action from the config
   * @param uses - The action to find (e.g., "actions/checkout")
   * @returns The resolved ref or undefined if not found
   */
  getActionRef(uses: string): string | undefined {
    const action = this.findAction(uses);
    return action?.ref;
  }

  /**
   * Creates a step chain builder for chaining steps with output handling
   * @param initialStep - The first step in the chain
   * @param outputs - Optional outputs from the initial step
   * @returns A StepChainBuilder instance
   */
  stepChain<T extends GitHubStepAny>(initialStep: GitHubStepAny, outputs?: any): StepChainBuilder<T> {
    return new StepChainBuilder<T>(initialStep, outputs || {});
  }
}
