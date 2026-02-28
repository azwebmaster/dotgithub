import * as path from 'path';
import { GitHubStack } from '../constructs/base.js';
import { ConstructResolver } from './resolver.js';
import { ActionsHelper } from './actions-helper.js';
import { SharedWorkflowHelper } from './shared-workflow-helper.js';
import type {
  ConstructConfig,
  StackConfig,
  GitHubConstruct,
  ConstructLoadResult,
  ConstructExecutionResult,
} from './types.js';
import type { ConstructDescription } from './schemas.js';
import type { DotGithubContext } from '../context.js';
import {
  validateConstructConfig,
  validateStackConfig,
  safeValidate,
  ConstructConfigSchema,
  StackConfigSchema,
} from './schemas.js';

export interface ConstructManagerOptions {
  projectRoot: string;
  context?: DotGithubContext;
}

export class ConstructManager {
  private readonly resolver: ConstructResolver;
  private readonly loadedConstructs = new Map<string, GitHubConstruct>();

  constructor(private readonly options: ConstructManagerOptions) {
    this.resolver = new ConstructResolver(options.projectRoot, options.context);
  }

  async loadConstructs(
    constructConfigs: ConstructConfig[]
  ): Promise<ConstructLoadResult[]> {
    // Validate all construct configurations first
    this.validateConstructConfigs(constructConfigs);

    const results = await this.resolver.resolveConstructs(constructConfigs);

    for (const result of results) {
      if (result.resolved) {
        this.loadedConstructs.set(result.config.name, result.construct);
      }
    }

    return results;
  }

  async executeConstructsForStack(
    stack: GitHubStack,
    stackConfig: StackConfig,
    constructConfigs: ConstructConfig[]
  ): Promise<ConstructExecutionResult[]> {
    const results: ConstructExecutionResult[] = [];

    // Validate stack configuration
    this.validateStackConfig(stackConfig);

    // Create a map of construct names to configs for quick lookup
    const constructConfigMap = new Map<string, ConstructConfig>();
    for (const config of constructConfigs) {
      constructConfigMap.set(config.name, config);
    }

    // Validate that all required constructs are loaded
    for (const constructName of stackConfig.constructs) {
      if (!this.loadedConstructs.has(constructName)) {
        throw new Error(
          `Construct "${constructName}" required by stack "${stackConfig.name}" is not loaded`
        );
      }

      if (!constructConfigMap.has(constructName)) {
        throw new Error(
          `Construct configuration for "${constructName}" not found`
        );
      }
    }

    // Check construct dependencies and conflicts
    const constructsToExecute = stackConfig.constructs.map((name: string) => ({
      name,
      construct: this.loadedConstructs.get(name)!,
      config: constructConfigMap.get(name)!,
    }));

    this.validateConstructDependencies(constructsToExecute);

    // Execute constructs in order
    for (const { name, construct, config } of constructsToExecute) {
      const startTime = Date.now();

      try {
        // Merge construct config and stack config
        const mergedConfig = {
          ...(stackConfig.config || {}),
          ...(config.config || {}),
          // Merge actions with stack config taking priority over construct config
          actions: {
            ...(config.actions || {}),
            ...(config.config?.actions || {}),
            // Stack config takes priority (overrides construct config)
            ...(stackConfig.actions || {}),
          },
        };

        // Set construct context properties directly on the stack
        stack.config = mergedConfig;
        stack.stackConfig = stackConfig;
        stack.projectRoot = this.options.projectRoot;

        // Create actions helper with the stack
        const actionsHelper = new ActionsHelper(stack);
        stack.actions = actionsHelper;

        // Create shared workflow helper with the stack
        const sharedWorkflowHelper = new SharedWorkflowHelper(stack);
        stack.sharedWorkflows = sharedWorkflowHelper;

        // Run validation if the construct implements it
        if (construct.validate) {
          await construct.validate(stack);
        }

        // Synthesize the construct
        await construct.synthesize(stack);

        const duration = Date.now() - startTime;
        results.push({
          construct,
          success: true,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          construct,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          duration,
        });

        throw new Error(
          `Construct "${name}" failed to execute: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    return results;
  }

  private validateConstructDependencies(
    constructs: Array<{
      name: string;
      construct: GitHubConstruct;
      config: ConstructConfig;
    }>
  ): void {
    const constructNames = new Set(constructs.map((c) => c.name));

    for (const { name, construct } of constructs) {
      // Check dependencies
      if (construct.dependencies) {
        for (const dep of construct.dependencies) {
          if (!constructNames.has(dep)) {
            throw new Error(
              `Construct "${name}" depends on "${dep}" which is not included in the stack`
            );
          }
        }
      }

      // Check conflicts
      if (construct.conflicts) {
        for (const conflict of construct.conflicts) {
          if (constructNames.has(conflict)) {
            throw new Error(
              `Construct "${name}" conflicts with "${conflict}" which is included in the stack`
            );
          }
        }
      }
    }
  }

  getLoadedConstruct(name: string): GitHubConstruct | undefined {
    return this.loadedConstructs.get(name);
  }

  getLoadedConstructs(): GitHubConstruct[] {
    return Array.from(this.loadedConstructs.values());
  }

  isConstructLoaded(name: string): boolean {
    return this.loadedConstructs.has(name);
  }

  clearLoadedConstructs(): void {
    this.loadedConstructs.clear();
  }

  /**
   * Validate construct configurations using Zod schemas
   */
  private validateConstructConfigs(
    constructConfigs: ConstructConfig[]
  ): void {
    for (const config of constructConfigs) {
      const validation = safeValidate(
        ConstructConfigSchema,
        config,
        `Invalid construct configuration for "${config.name}"`
      );
      if (!validation.success) {
        throw new Error(validation.error);
      }
    }
  }

  /**
   * Validate stack configuration using Zod schemas
   */
  private validateStackConfig(stackConfig: StackConfig): void {
    const validation = safeValidate(
      StackConfigSchema,
      stackConfig,
      `Invalid stack configuration for "${stackConfig.name}"`
    );
    if (!validation.success) {
      throw new Error(validation.error);
    }
  }

  /**
   * Public method to validate construct configurations
   */
  validateConstructConfigurations(
    constructConfigs: unknown[]
  ): ConstructConfig[] {
    const validatedConfigs: ConstructConfig[] = [];

    for (const config of constructConfigs) {
      const validation = safeValidate(
        ConstructConfigSchema,
        config,
        'Invalid construct configuration'
      );
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
      const validation = safeValidate(
        StackConfigSchema,
        config,
        'Invalid stack configuration'
      );
      if (!validation.success) {
        throw new Error(validation.error);
      }
      validatedConfigs.push(validation.data);
    }

    return validatedConfigs;
  }

  /**
   * Get description of a specific construct
   */
  async describeConstruct(
    constructName: string
  ): Promise<ConstructDescription | null> {
    const construct = this.loadedConstructs.get(constructName);
    if (!construct) {
      return null;
    }

    if (construct.describe) {
      const description = await construct.describe();
      // Basic type checking for ConstructDescription
      if (!description || typeof description !== 'object') {
        throw new Error(
          `Invalid construct description for "${constructName}": must be an object`
        );
      }
      if (!description.name || typeof description.name !== 'string') {
        throw new Error(
          `Invalid construct description for "${constructName}": name must be a string`
        );
      }
      return description as ConstructDescription;
    }

    // Return basic description if construct doesn't implement describe method
    return {
      name: construct.name,
      version: construct.version,
      description: construct.description,
      dependencies: construct.dependencies,
      conflicts: construct.conflicts,
    };
  }

  /**
   * List all loaded constructs with their descriptions
   */
  async listConstructs(): Promise<
    Array<{ name: string; description: ConstructDescription | null }>
  > {
    const results: Array<{
      name: string;
      description: ConstructDescription | null;
    }> = [];

    for (const [name, construct] of this.loadedConstructs) {
      try {
        const description = await this.describeConstruct(name);
        results.push({ name, description });
      } catch (error) {
        // If description fails, still include the construct but with null description
        results.push({
          name,
          description: null,
        });
      }
    }

    return results;
  }

  /**
   * Get configuration schema for a specific construct
   */
  async getConstructConfigSchema(constructName: string): Promise<any | null> {
    const description = await this.describeConstruct(constructName);
    return description?.configSchema || null;
  }

  /**
   * Validate construct configuration against its schema
   */
  async validateConstructConfigAgainstSchema(
    constructName: string,
    config: unknown
  ): Promise<{ success: true; data: any } | { success: false; error: string }> {
    const schema = await this.getConstructConfigSchema(constructName);
    if (!schema) {
      return {
        success: false,
        error: `Construct "${constructName}" does not provide a configuration schema`,
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
