import type { PluginContext } from './types';
import { StepChainBuilder } from './actions-helper';
import type { GitHubStepAny, GitHubStep, GitHubStepWith, GitHubStepAction } from '../types/workflow';
import { createStep as createStepFunction } from '../actions';

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

export type GitHubOutputValues<T> = Record<keyof T, GitHubOutputValue>;

export class GitHubAction<TInputs extends GitHubStepWith = GitHubStepWith, TOutputs = Record<string, GitHubOutputValue>> {
  private collection: ActionCollection;
  
  // These properties should be overridden by subclasses
  protected uses: string = '';
  protected fallbackRef: string = '';
  protected outputs: Record<string, GitHubOutputValue> = {};

  constructor(collection: ActionCollection) {
    this.collection = collection;
  }

  protected getContext(): PluginContext {
    return this.collection.getContext();
  }

  protected createOutputs(id: string, outputs: Record<string, GitHubOutputValue>): GitHubOutputValues<TOutputs> {
    return Object.keys(outputs).reduce((acc: GitHubOutputValues<TOutputs>, key) => {
      acc[key as keyof TOutputs] = new GitHubOutputValue(`step.${id}.outputs.${key}`);
      return acc;
    }, {} as GitHubOutputValues<TOutputs>);
  }

  private createStep(
    uses: string, 
    step?: Partial<Omit<GitHubStep<TInputs>, "uses">>, 
    ref?: string,
    fallbackRef?: string
  ): GitHubStep<TInputs> {
    return createStepFunction(uses, step, ref, this.getContext(), fallbackRef);
  }

  /**
   * Generic invoke method that reads uses and fallbackRef from class properties
   * @param name - The name of the step
   * @param inputs - Input parameters for the action
   * @param step - Additional step configuration
   * @param ref - Optional git reference
   * @returns A GitHub step configuration with outputs
   */
  public invoke(
    name: string,
    inputs?: TInputs,
    step?: Partial<Omit<GitHubStepAction, "uses" | "with">>,
    ref?: string,
  ): {
    step: GitHubStep<TInputs>;
    outputs: GitHubOutputValues<TOutputs>;
  } {
    // Generate a deterministic ID if step ID is not set
    const stepId = step?.id ?? this.generateIdempotentId(name, this.uses, inputs, ref);
    
    return {
      step: this.createStep(
        this.uses,
        { name, ...step, id: stepId, with: inputs },
        ref,
        this.fallbackRef,
      ),
      outputs: this.createOutputs(
        stepId,
        this.outputs,
      ),
    };
  }

  /**
   * Generates a deterministic step ID based on step properties
   * @param name - The step name
   * @param uses - The action being used
   * @param inputs - The step inputs
   * @param ref - The git reference
   * @returns A deterministic step ID
   */
  private generateIdempotentId(name: string, uses: string, inputs?: TInputs, ref?: string): string {
    // Create a deterministic hash based on step properties
    const content = JSON.stringify({ name, uses, inputs, ref });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to a positive hex string and take first 8 characters
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
    return `step-${hexHash}`;
  }

  /**
   * Creates a step chain builder starting with the current action
   * @param name - The name of the step
   * @param inputs - Input parameters for the action
   * @param step - Additional step configuration
   * @param ref - Optional git reference
   * @returns A StepChainBuilder instance for chaining additional steps
   */
  public chain(
    name: string,
    inputs?: TInputs,
    step?: Partial<Omit<GitHubStepAction, "uses" | "with">>,
    ref?: string): StepChainBuilder<TOutputs> {
    const results = this.invoke(name, inputs, step, ref);
    return new StepChainBuilder<TOutputs>(results.step, results.outputs as TOutputs);
  }
}

/**
 * Abstract base class for action collections that provides access to generated actions
 * Each generated action will have its `this` context bound to an ActionCollection instance
 */
export abstract class ActionCollection {
  protected readonly context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  /**
   * Gets the plugin context
   * @returns The plugin context
   */
  getContext(): PluginContext {
    return this.context;
  }

  /**
   * Gets the merged configuration from the plugin context
   * @returns The merged configuration
   */
  getConfig() {
    return this.context.config;
  }

  /**
   * Gets the stack configuration from the plugin context
   * @returns The stack configuration
   */
  getStackConfig() {
    return this.context.stackConfig;
  }

  /**
   * Gets the project root path
   * @returns The project root path
   */
  getProjectRoot(): string {
    return this.context.projectRoot;
  }

  /**
   * Gets the GitHub stack instance
   * @returns The GitHub stack instance
   */
  getStack() {
    return this.context.stack;
  }
}
