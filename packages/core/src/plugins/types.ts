import type { GitHubStack } from '../constructs/base.js';
import type {
  ConstructConfig,
  StackConfig,
  ConstructLoadResult,
  ConstructExecutionResult,
  ConstructDescription,
} from './schemas.js';
import type { ActionsHelper } from './actions-helper.js';
import type { SharedWorkflowHelper } from './shared-workflow-helper.js';

// Re-export types for backward compatibility
export type {
  ConstructConfig,
  StackConfig,
  ConstructLoadResult,
  ConstructExecutionResult,
  ConstructDescription,
} from './schemas.js';

/**
 * Construct context passed to construct methods.
 * Provides access to the stack and additional context information.
 */
export interface ConstructContext {
  /** The GitHub stack instance */
  stack: GitHubStack;
  /** Merged configuration from construct and stack */
  config: Record<string, any>;
  /** Stack configuration */
  stackConfig: StackConfig;
  /** Project root directory */
  projectRoot: string;
  /** Actions helper for invoking actions */
  actions: ActionsHelper;
  /** Shared workflow helper for creating reusable workflows */
  sharedWorkflows: SharedWorkflowHelper;
}

export abstract class GitHubConstruct {
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly dependencies?: string[];
  readonly conflicts?: string[];

  constructor() {
    this.name = 'base-construct';
  }

  validate?(stack: GitHubStack): Promise<void> | void;

  synthesize(stack: GitHubStack): Promise<void> | void {
    // Default implementation does nothing
  }

  /**
   * Optional method to describe the construct including its configuration schema
   * This method should return comprehensive information about the construct
   */
  describe?(): ConstructDescription | Promise<ConstructDescription>;
}

export interface ConstructModule {
  default?: GitHubConstruct;
  construct?: GitHubConstruct;
}
