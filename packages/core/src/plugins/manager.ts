import * as path from 'path';
import { GitHubStack } from '../constructs/base.js';
import { PluginResolver } from './resolver.js';
import { ActionsHelper } from './actions-helper.js';
import { SharedWorkflowHelper } from './shared-workflow-helper.js';
import type { 
  PluginConfig, 
  StackConfig, 
  DotGitHubPlugin, 
  PluginLoadResult,
  PluginExecutionResult
} from './types.js';
import type { PluginDescription } from './schemas.js';
import type { DotGithubContext } from '../context.js';
import { 
  validatePluginConfig, 
  validateStackConfig, 
  safeValidate,
  PluginConfigSchema,
  StackConfigSchema
} from './schemas.js';

export interface PluginManagerOptions {
  projectRoot: string;
  context?: DotGithubContext;
}

export class PluginManager {
  private readonly resolver: PluginResolver;
  private readonly loadedPlugins = new Map<string, DotGitHubPlugin>();

  constructor(private readonly options: PluginManagerOptions) {
    this.resolver = new PluginResolver(options.projectRoot, options.context);
  }

  async loadPlugins(pluginConfigs: PluginConfig[]): Promise<PluginLoadResult[]> {
    // Validate all plugin configurations first
    this.validatePluginConfigs(pluginConfigs);
    
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
    
    // Validate stack configuration
    this.validateStackConfig(stackConfig);
    
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
      .map((name: string) => ({
        name,
        plugin: this.loadedPlugins.get(name)!,
        config: pluginConfigMap.get(name)!
      }));

    this.validatePluginDependencies(pluginsToExecute);

    // Execute plugins in order
    for (const { name, plugin, config } of pluginsToExecute) {
      const startTime = Date.now();
      
      try {
        // Merge plugin config and stack config
        const mergedConfig = {
          ...(stackConfig.config || {}),
          ...(config.config || {}),
          // Merge actions with stack config taking priority over plugin config
          actions: {
            ...(config.actions || {}),
            ...(config.config?.actions || {}),
            // Stack config takes priority (overrides plugin config)
            ...(stackConfig.actions || {})
          }
        };
        

        // Set plugin context properties directly on the stack
        stack.config = mergedConfig;
        stack.stackConfig = stackConfig;
        stack.projectRoot = this.options.projectRoot;

        // Create actions helper with the stack
        const actionsHelper = new ActionsHelper(stack);
        stack.actions = actionsHelper;

        // Create shared workflow helper with the stack
        const sharedWorkflowHelper = new SharedWorkflowHelper(stack);
        stack.sharedWorkflows = sharedWorkflowHelper;

        // Run validation if the plugin implements it
        if (plugin.validate) {
          await plugin.validate(stack);
        }

        // Synthesize the plugin
        await plugin.synthesize(stack);

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

  /**
   * Validate plugin configurations using Zod schemas
   */
  private validatePluginConfigs(pluginConfigs: PluginConfig[]): void {
    for (const config of pluginConfigs) {
      const validation = safeValidate(PluginConfigSchema, config, `Invalid plugin configuration for "${config.name}"`);
      if (!validation.success) {
        throw new Error(validation.error);
      }
    }
  }

  /**
   * Validate stack configuration using Zod schemas
   */
  private validateStackConfig(stackConfig: StackConfig): void {
    const validation = safeValidate(StackConfigSchema, stackConfig, `Invalid stack configuration for "${stackConfig.name}"`);
    if (!validation.success) {
      throw new Error(validation.error);
    }
  }


  /**
   * Public method to validate plugin configurations
   */
  validatePluginConfigurations(pluginConfigs: unknown[]): PluginConfig[] {
    const validatedConfigs: PluginConfig[] = [];
    
    for (const config of pluginConfigs) {
      const validation = safeValidate(PluginConfigSchema, config, 'Invalid plugin configuration');
      if (!validation.success) {
        throw new Error(validation.error);
      }
      validatedConfigs.push(validation.data);
    }
    
    return validatedConfigs;
  }

  /**
   * Public method to validate stack configurations
   */
  validateStackConfigurations(stackConfigs: unknown[]): StackConfig[] {
    const validatedConfigs: StackConfig[] = [];
    
    for (const config of stackConfigs) {
      const validation = safeValidate(StackConfigSchema, config, 'Invalid stack configuration');
      if (!validation.success) {
        throw new Error(validation.error);
      }
      validatedConfigs.push(validation.data);
    }
    
    return validatedConfigs;
  }

  /**
   * Get description of a specific plugin
   */
  async describePlugin(pluginName: string): Promise<PluginDescription | null> {
    const plugin = this.loadedPlugins.get(pluginName);
    if (!plugin) {
      return null;
    }

    if (plugin.describe) {
      const description = await plugin.describe();
      // Basic type checking for PluginDescription
      if (!description || typeof description !== 'object') {
        throw new Error(`Invalid plugin description for "${pluginName}": must be an object`);
      }
      if (!description.name || typeof description.name !== 'string') {
        throw new Error(`Invalid plugin description for "${pluginName}": name must be a string`);
      }
      return description as PluginDescription;
    }

    // Return basic description if plugin doesn't implement describe method
    return {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      dependencies: plugin.dependencies,
      conflicts: plugin.conflicts
    };
  }

  /**
   * List all loaded plugins with their descriptions
   */
  async listPlugins(): Promise<Array<{ name: string; description: PluginDescription | null }>> {
    const results: Array<{ name: string; description: PluginDescription | null }> = [];
    
    for (const [name, plugin] of this.loadedPlugins) {
      try {
        const description = await this.describePlugin(name);
        results.push({ name, description });
      } catch (error) {
        // If description fails, still include the plugin but with null description
        results.push({ 
          name, 
          description: null 
        });
      }
    }
    
    return results;
  }

  /**
   * Get configuration schema for a specific plugin
   */
  async getPluginConfigSchema(pluginName: string): Promise<any | null> {
    const description = await this.describePlugin(pluginName);
    return description?.configSchema || null;
  }

  /**
   * Validate plugin configuration against its schema
   */
  async validatePluginConfigAgainstSchema(pluginName: string, config: unknown): Promise<{ success: true; data: any } | { success: false; error: string }> {
    const schema = await this.getPluginConfigSchema(pluginName);
    if (!schema) {
      return { 
        success: false, 
        error: `Plugin "${pluginName}" does not provide a configuration schema` 
      };
    }

    try {
      const result = schema.parse(config);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Configuration validation failed' };
    }
  }
}