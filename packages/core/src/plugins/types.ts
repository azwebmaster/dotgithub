import type { GitHubStack } from '../constructs/base';
import type { 
  PluginConfig, 
  StackConfig, 
  PluginContext,
  PluginLoadResult, 
  PluginExecutionResult,
  PluginDescription
} from './schemas';

// Re-export types for backward compatibility
export type { 
  PluginConfig, 
  StackConfig, 
  PluginContext,
  PluginLoadResult, 
  PluginExecutionResult,
  PluginDescription
} from './schemas';

export abstract class DotGitHubPlugin {
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly dependencies?: string[];
  readonly conflicts?: string[];

  constructor() {
    this.name = 'base-plugin';
  }
  
  validate?(context: PluginContext): Promise<void> | void;

  synthesize(context: PluginContext): Promise<void> | void {
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