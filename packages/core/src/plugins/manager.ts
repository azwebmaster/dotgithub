import * as path from 'path';
import { GitHubStack } from '../constructs/base';
import { PluginResolver } from './resolver';
import type { 
  PluginConfig, 
  StackConfig, 
  DotGitHubPlugin, 
  PluginContext, 
  PluginLoadResult,
  PluginExecutionResult
} from './types';

export interface PluginManagerOptions {
  projectRoot: string;
}

export class PluginManager {
  private readonly resolver: PluginResolver;
  private readonly loadedPlugins = new Map<string, DotGitHubPlugin>();

  constructor(private readonly options: PluginManagerOptions) {
    this.resolver = new PluginResolver(options.projectRoot);
  }

  async loadPlugins(pluginConfigs: PluginConfig[]): Promise<PluginLoadResult[]> {
    const results = await this.resolver.resolvePlugins(pluginConfigs);
    
    for (const result of results) {
      if (result.resolved) {
        this.loadedPlugins.set(result.config.name, result.plugin);
      }
    }

    return results;
  }

  async executePluginsForStack(
    stack: GitHubStack,
    stackConfig: StackConfig,
    pluginConfigs: PluginConfig[]
  ): Promise<PluginExecutionResult[]> {
    const results: PluginExecutionResult[] = [];
    
    // Create a map of plugin names to configs for quick lookup
    const pluginConfigMap = new Map<string, PluginConfig>();
    for (const config of pluginConfigs) {
      pluginConfigMap.set(config.name, config);
    }

    // Validate that all required plugins are loaded
    for (const pluginName of stackConfig.plugins) {
      if (!this.loadedPlugins.has(pluginName)) {
        throw new Error(`Plugin "${pluginName}" required by stack "${stackConfig.name}" is not loaded`);
      }
      
      if (!pluginConfigMap.has(pluginName)) {
        throw new Error(`Plugin configuration for "${pluginName}" not found`);
      }
    }

    // Check plugin dependencies and conflicts
    const pluginsToExecute = stackConfig.plugins
      .map(name => ({
        name,
        plugin: this.loadedPlugins.get(name)!,
        config: pluginConfigMap.get(name)!
      }));

    this.validatePluginDependencies(pluginsToExecute);

    // Execute plugins in order
    for (const { name, plugin, config } of pluginsToExecute) {
      const startTime = Date.now();
      
      try {
        const context: PluginContext = {
          stack,
          config: config.config || {},
          stackConfig,
          projectRoot: this.options.projectRoot
        };

        // Run validation if the plugin implements it
        if (plugin.validate) {
          await plugin.validate(context);
        }

        // Apply the plugin
        await plugin.apply(context);

        const duration = Date.now() - startTime;
        results.push({
          plugin,
          success: true,
          duration
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          plugin,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          duration
        });

        throw new Error(`Plugin "${name}" failed to execute: ${error instanceof Error ? error.message : error}`);
      }
    }

    return results;
  }

  private validatePluginDependencies(
    plugins: Array<{ name: string; plugin: DotGitHubPlugin; config: PluginConfig }>
  ): void {
    const pluginNames = new Set(plugins.map(p => p.name));

    for (const { name, plugin } of plugins) {
      // Check dependencies
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!pluginNames.has(dep)) {
            throw new Error(`Plugin "${name}" depends on "${dep}" which is not included in the stack`);
          }
        }
      }

      // Check conflicts
      if (plugin.conflicts) {
        for (const conflict of plugin.conflicts) {
          if (pluginNames.has(conflict)) {
            throw new Error(`Plugin "${name}" conflicts with "${conflict}" which is included in the stack`);
          }
        }
      }
    }
  }

  getLoadedPlugin(name: string): DotGitHubPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  getLoadedPlugins(): DotGitHubPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  isPluginLoaded(name: string): boolean {
    return this.loadedPlugins.has(name);
  }

  clearLoadedPlugins(): void {
    this.loadedPlugins.clear();
  }
}