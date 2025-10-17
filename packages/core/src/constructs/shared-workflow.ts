import { Construct, GitHubStack } from './base.js';
import type { 
  GitHubReusableWorkflow, 
  GitHubWorkflowInputs, 
  GitHubJob,
  GitHubJobWith 
} from '../types/workflow.js';
import type { GitHubInputValue } from '../types/index.js';
import { WorkflowConstruct } from './workflow.js';
import type { DotGithubConfig } from '../config.js';

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
export class SharedWorkflowConstruct<TInputs extends GitHubWorkflowInputs> extends WorkflowConstruct {
  private readonly _config: SharedWorkflowConfig;
  private readonly _workflowPath: string;
  private readonly _stack: GitHubStack;


  constructor(
    scope: GitHubStack, 
    id: string, 
    inputs: TInputs & GitHubWorkflowInputs,
    workflow: Omit<GitHubReusableWorkflow, 'on' | 'inputs'>
  ) {
    super(scope, id, {
      ...workflow,
      // Ensure the workflow has the correct trigger for reusable workflows
      on: {
        workflow_call: {
          inputs: inputs
        }
      }
    });

    this._config = {
      inputs,
      workflow
    };

    // Generate a path for the shared workflow file
    this._workflowPath = `.github/workflows/${id}.yml`;
    
    // Find the GitHubStack in the construct tree
    this._stack = scope
  }

  /**
   * Creates a job that calls this shared workflow with the provided inputs.
   * @param inputs - The input values to pass to the shared workflow
   * @param jobConfig - Additional job configuration (runs-on, needs, etc.)
   * @returns A job configuration that calls the shared workflow
   */
  call(
    inputs: { [K in keyof TInputs]?: GitHubInputValue } = {} as { [K in keyof TInputs]?: GitHubInputValue },
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
