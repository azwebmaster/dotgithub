import type { GitHubStack } from '../constructs/base.js';
import { StepChainBuilder } from './actions-helper.js';
import type {
  GitHubStepAny,
  GitHubStep,
  GitHubStepWith,
  GitHubStepAction,
  GitHubSteps,
} from '../types/workflow.js';
import type { ActionConstructProps } from '../constructs/action.js';
import { createStep, createStep as createStepFunction } from '../actions.js';

export class GitHubOutputValue {
  /** The output value as a string */
  public value: string;

  constructor(value: string) {
    this.value = value;
  }

  /** Returns the output value as a string */
  public toString(): string {
    return this.value;
  }

  /** Returns the output value as a GitHub Actions expression (e.g., ${{ step.id.outputs.ref }}) */
  public toExpr(): string {
    return `\${{ ${this.value} }}`;
  }
}

export class ActionInvocationResult<TOutputs> {
  constructor(steps: GitHubSteps, outputs: TOutputs) {
    this._steps = steps;
    this._outputs = outputs;
  }
  private _steps: GitHubSteps;
  private _outputs: TOutputs;

  /**
   * Chains another step after this action, providing access to the outputs
   * @param stepFactory Function that receives the outputs from this action and returns a new step
   * @returns A new ActionInvocationResult for further chaining
   */
  then(
    stepFactory: (outputs: TOutputs) => GitHubStepAny
  ): ActionInvocationResult<TOutputs> {
    const newStep = stepFactory(this._outputs);
    this._steps.push(newStep);
    return this;
  }

  toSteps(): GitHubSteps {
    return this._steps;
  }

  outputs(): TOutputs {
    return this._outputs;
  }
}

export type GitHubOutputValues<T> = Record<keyof T, GitHubOutputValue>;

/**
 * Abstract base class for action collections that provides access to generated actions
 * Each generated action will have its `this` context bound to an ActionCollection instance
 */
export abstract class ActionCollection {
  protected readonly stack: GitHubStack;

  constructor(stack: GitHubStack) {
    this.stack = stack;
  }

  /**
   * Gets the GitHub stack
   * @returns The GitHub stack
   */
  getStack(): GitHubStack {
    return this.stack;
  }

  /**
   * Gets the merged configuration from the stack
   * @returns The merged configuration
   */
  getConfig() {
    return this.stack.config;
  }

  /**
   * Gets the stack configuration from the stack
   * @returns The stack configuration
   */
  getStackConfig() {
    return this.stack.stackConfig;
  }

  /**
   * Gets the project root path
   * @returns The project root path
   */
  getProjectRoot(): string {
    return this.stack.projectRoot!;
  }

  protected createOutputs<TOutputs>(id: string, outputs: TOutputs): TOutputs {
    // Create a new object that preserves the original structure and JSDoc comments
    const result = {} as TOutputs;
    for (const [key, originalOutput] of Object.entries(outputs as any)) {
      // Create a new GitHubOutputValue with the step-specific path
      const newOutput = new GitHubOutputValue(`step.${id}.outputs.${key}`);
      // Preserve the original object structure
      (result as any)[key] = newOutput;
    }
    return result;
  }

  private createStep<TInputs extends GitHubStepWith>(
    uses: string,
    step?: Partial<Omit<GitHubStep<TInputs>, 'uses'>>,
    ref?: string,
    fallbackRef?: string
  ): GitHubStep<TInputs> {
    return createStepFunction(uses, step, ref, this.getStack(), fallbackRef);
  }

  invokeAction<TInputs extends GitHubStepWith, TOutputs>({
    uses,
    inputs,
    stepOptions,
    ref,
    fallbackRef,
    outputs,
  }: {
    uses: string;
    inputs?: TInputs;
    stepOptions?: Partial<Omit<GitHubStep<TInputs>, 'uses'>>;
    ref?: string;
    fallbackRef?: string;
    outputs?: TOutputs;
  }): ActionInvocationResult<TOutputs> {
    const step = this.createStep(
      uses,
      { with: inputs, ...stepOptions },
      ref,
      fallbackRef
    );
    return new ActionInvocationResult(
      [step],
      this.createOutputs<TOutputs>(step.id!, outputs ?? ({} as TOutputs))
    );
  }

  /**
   * Creates an action construct with the given properties
   * @param ActionConstructClass The action construct class to instantiate
   * @param id The unique identifier for the construct
   * @param props The properties for the action construct
   * @returns A new instance of the action construct
   */
  createActionConstruct<T extends any>(
    ActionConstructClass: new (
      scope: any,
      id: string,
      props: ActionConstructProps<any>
    ) => T,
    id: string,
    props: ActionConstructProps<any>
  ): T {
    return new ActionConstructClass(this.getStack(), id, props);
  }
}
