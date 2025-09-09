import type { DotGitHubPlugin, PluginContext } from '../types';

export abstract class BasePlugin implements DotGitHubPlugin {
  abstract readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly dependencies?: string[];
  readonly conflicts?: string[];

  validate?(context: PluginContext): Promise<void> | void {
    // Default validation - override in subclasses if needed
  }

  abstract apply(context: PluginContext): Promise<void> | void;

  protected validateRequiredConfig(context: PluginContext, requiredKeys: string[]): void {
    const missing = requiredKeys.filter(key => !(key in context.config));
    if (missing.length > 0) {
      throw new Error(`Plugin "${this.name}" is missing required configuration: ${missing.join(', ')}`);
    }
  }

  protected getConfig<T = any>(context: PluginContext, key: string, defaultValue?: T): T {
    return context.config[key] ?? defaultValue;
  }

  protected hasConfig(context: PluginContext, key: string): boolean {
    return key in context.config;
  }
}