import { Construct } from './base';
import type { 
  GitHubReusableWorkflow, 
  GitHubWorkflowInputs, 
  GitHubJob,
  GitHubJobWith 
} from '../types/workflow';
import type { GitHubInputValue } from '../types';

/**
 * Configuration for a shared workflow construct.
 * Defines the inputs and workflow definition for a reusable workflow.
 */
export interface SharedWorkflowConfig {
  /** Input parameters that can be passed to the shared workflow */
  inputs: GitHubWorkflowInputs;
  /** The workflow definition that will be executed (without the 'on' trigger) */
  workflow: Omit<GitHubReusableWorkflow, 'on'>;
}

/**
 * A construct that represents a shared/reusable workflow.
 * Allows defining a workflow with typed inputs that can be called from other workflows.
 */
export class SharedWorkflowConstruct<T> extends Construct {
  private readonly _config: SharedWorkflowConfig;
  private readonly _workflowPath: string;

  constructor(
    scope: Construct, 
    id: string, 
    inputs: T extends GitHubWorkflowInputs ? T : GitHubWorkflowInputs,
    workflow: Omit<GitHubReusableWorkflow, 'on'>
  ) {
    super(scope, id);
    
    this._config = {
      inputs,
      workflow
    };
    
    // Generate a path for the shared workflow file
    this._workflowPath = `.github/workflows/${id}.yml`;
  }

  /**
   * Creates a job that calls this shared workflow with the provided inputs.
   * @param inputs - The input values to pass to the shared workflow
   * @param jobConfig - Additional job configuration (runs-on, needs, etc.)
   * @returns A job configuration that calls the shared workflow
   */
  call(
    inputs: { [K in keyof T]?: GitHubInputValue } = {} as { [K in keyof T]?: GitHubInputValue },
    jobConfig: Partial<GitHubJob> = {}
  ): GitHubJob {
    // Validate that required inputs are provided
    this._validateInputs(inputs);

    return {
      uses: this._workflowPath,
      with: inputs,
      ...jobConfig
    };
  }

  /**
   * Gets the workflow definition for this shared workflow.
   */
  get workflow(): GitHubReusableWorkflow {
    return {
      ...this._config.workflow,
      // Ensure the workflow has the correct trigger for reusable workflows
      on: 'workflow_call',
      // Ensure the workflow has the inputs defined
      inputs: this._config.inputs
    };
  }

  /**
   * Gets the input definitions for this shared workflow.
   */
  get inputs(): GitHubWorkflowInputs {
    return { ...this._config.inputs };
  }

  /**
   * Gets the path where this shared workflow file should be located.
   */
  get workflowPath(): string {
    return this._workflowPath;
  }

  /**
   * Validates that all required inputs are provided.
   * @param inputs - The input values to validate
   */
  private _validateInputs(inputs: GitHubJobWith): void {
    for (const [inputName, inputDef] of Object.entries(this._config.inputs)) {
      if (inputDef.required && !(inputName in inputs)) {
        throw new Error(
          `Required input '${inputName}' is missing for shared workflow '${this.node.id}'`
        );
      }
    }
  }
}
