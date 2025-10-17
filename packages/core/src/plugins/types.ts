import type { GitHubStack } from '../constructs/base.js';
import type {
  PluginConfig,
  StackConfig,
  PluginLoadResult,
  PluginExecutionResult,
  PluginDescription,
} from './schemas.js';

// Re-export types for backward compatibility
export type {
  PluginConfig,
  StackConfig,
  PluginLoadResult,
  PluginExecutionResult,
  PluginDescription,
} from './schemas.js';

export abstract class DotGitHubPlugin {
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly dependencies?: string[];
  readonly conflicts?: string[];

  constructor() {
    this.name = 'base-plugin';
  }

  validate?(stack: GitHubStack): Promise<void> | void;

  synthesize(stack: GitHubStack): Promise<void> | void {
    // Default implementation does nothing
  }

  /**
   * Optional method to describe the plugin including its configuration schema
   * This method should return comprehensive information about the plugin
   */
  describe?(): PluginDescription | Promise<PluginDescription>;
}

export interface PluginModule {
  default?: DotGitHubPlugin;
  plugin?: DotGitHubPlugin;
}
