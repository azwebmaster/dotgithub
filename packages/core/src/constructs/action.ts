import { Construct, GitHubStack } from './base.js';
import type { IConstruct } from './base.js';
import type {
  GitHubStepAction,
  GitHubStepWith,
  GitHubStepAny,
  GitHubSteps,
} from '../types/workflow.js';
import type { GitHubInputValue } from '../types/common.js';
import {
  GitHubOutputValue,
  ActionInvocationResult,
} from '../plugins/action-collection.js';

export interface ActionConstructProps<
  TInputs extends GitHubStepWith = GitHubStepWith,
> {
  /** Input parameters for the action */
  inputs?: TInputs;
  /** Additional step configuration options */
  stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with'>>;
  /** Optional git reference override */
  ref?: string;
}

/**
 * Abstract base class for all GitHub Action constructs.
 * Provides common functionality for action execution and step generation.
 */
export abstract class ActionConstruct<
  TInputs extends GitHubStepWith = GitHubStepWith,
  TOutputs = Record<string, GitHubOutputValue>,
> extends Construct {
  protected readonly _inputs: TInputs | undefined;
  protected readonly _stepOptions:
    | Partial<Omit<GitHubStepAction, 'uses' | 'with'>>
    | undefined;
  protected readonly _ref: string | undefined;

  // These properties should be overridden by subclasses
  protected abstract readonly uses: string;
  protected abstract readonly fallbackRef: string;
  protected abstract readonly outputs: TOutputs;

  constructor(
    scope: Construct | undefined,
    id: string,
    props: ActionConstructProps<TInputs>
  ) {
    super(scope, id);

    this._inputs = props.inputs;
    this._stepOptions = props.stepOptions;
    this._ref = props.ref;
  }

  /**
   * Gets the current inputs for this action
   */
  get inputs(): TInputs | undefined {
    return this._inputs;
  }

  /**
   * Gets the current step options for this action
   */
  get stepOptions():
    | Partial<Omit<GitHubStepAction, 'uses' | 'with'>>
    | undefined {
    return this._stepOptions;
  }

  /**
   * Gets the current git reference for this action
   */
  get ref(): string | undefined {
    return this._ref;
  }

  /**
   * Gets the outputs for this action
   */
  get actionOutputs(): TOutputs {
    return this.outputs;
  }

  /**
   * Updates the inputs for this action
   */
  updateInputs(inputs: TInputs): this {
    (this as any)._inputs = inputs;
    return this;
  }

  /**
   * Updates the step options for this action
   */
  updateStepOptions(
    stepOptions: Partial<Omit<GitHubStepAction, 'uses' | 'with'>>
  ): this {
    (this as any)._stepOptions = stepOptions;
    return this;
  }

  /**
   * Updates the git reference for this action
   */
  updateRef(ref: string): this {
    (this as any)._ref = ref;
    return this;
  }

  /**
   * Generates a GitHub step from this action construct
   */
  toStep(): GitHubStepAction {
    // Allow config to override the fallback reference
    const configRef = this.stack.config?.actions?.[this.uses];
    const finalRef = this._ref || configRef || this.fallbackRef;

    return {
      uses: `${this.uses}@${finalRef}`,
      with: this._inputs,
      ...this._stepOptions,
    };
  }

  /**
   * Creates an ActionInvocationResult that provides access to outputs and allows chaining additional steps
   * @param stepFactory Optional function that receives the outputs from this action and returns a new step
   * @returns An ActionInvocationResult with the current step and outputs, plus any chained steps
   */
  then(
    stepFactory?: (outputs: TOutputs) => GitHubStepAny
  ): ActionInvocationResult<TOutputs> {
    const step = this.toStep();
    const steps: GitHubSteps = [step];

    // Create outputs with proper step ID references
    const outputs = this.createOutputs(step.id || this.node.id, this.outputs);

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
        const newOutput = new GitHubOutputValue(
          `step.${stepId}.outputs.${key}`
        );
        (result as any)[key] = newOutput;
      } else {
        // Preserve non-GitHubOutputValue outputs as-is
        (result as any)[key] = output;
      }
    }

    return result;
  }

  /**
   * Creates a copy of this action construct with new inputs
   */
  withInputs(inputs: TInputs): this {
    const newInstance = Object.create(Object.getPrototypeOf(this));
    Object.assign(newInstance, this);
    newInstance._inputs = inputs;
    return newInstance;
  }

  /**
   * Creates a copy of this action construct with new step options
   */
  withStepOptions(
    stepOptions: Partial<Omit<GitHubStepAction, 'uses' | 'with'>>
  ): this {
    const newInstance = Object.create(Object.getPrototypeOf(this));
    Object.assign(newInstance, this);
    newInstance._stepOptions = stepOptions;
    return newInstance;
  }

  /**
   * Creates a copy of this action construct with a new git reference
   */
  withRef(ref: string): this {
    const newInstance = Object.create(Object.getPrototypeOf(this));
    Object.assign(newInstance, this);
    newInstance._ref = ref;
    return newInstance;
  }

  /**
   * Creates a copy of this action construct with a new ID
   */
  withId(id: string): this {
    const newInstance = Object.create(Object.getPrototypeOf(this));
    Object.assign(newInstance, this);
    newInstance.node = new (this.node.constructor as any)(
      newInstance,
      this.node.scope,
      id
    );
    return newInstance;
  }
}
