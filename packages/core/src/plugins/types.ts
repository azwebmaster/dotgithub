import type { GitHubStack } from '../constructs/base';

export interface PluginConfig {
  name: string;
  package: string;
  config?: Record<string, any>;
  enabled?: boolean;
}

export interface StackConfig {
  name: string;
  plugins: string[];
  config?: Record<string, any>;
}

export interface PluginContext {
  stack: GitHubStack;
  config: Record<string, any>;
  stackConfig: StackConfig;
  projectRoot: string;
}

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

  apply(context: PluginContext): Promise<void> | void {
    // Default implementation does nothing
  }
}

export interface PluginModule {
  default?: DotGitHubPlugin;
  plugin?: DotGitHubPlugin;
}

export interface PluginLoadResult {
  plugin: DotGitHubPlugin;
  config: PluginConfig;
  resolved: boolean;
}

export interface PluginExecutionResult {
  plugin: DotGitHubPlugin;
  success: boolean;
  error?: Error;
  duration: number;
}