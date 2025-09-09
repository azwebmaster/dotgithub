import * as path from 'path';
import * as fs from 'fs';
import type { PluginConfig, PluginModule, DotGitHubPlugin, PluginLoadResult } from './types';

export class PluginResolver {
  constructor(private readonly projectRoot: string) {}

  async resolvePlugin(config: PluginConfig): Promise<PluginLoadResult> {
    let plugin: DotGitHubPlugin;
    let resolved = false;

    try {
      if (this.isLocalPath(config.package)) {
        plugin = await this.loadLocalPlugin(config.package);
        resolved = true;
      } else {
        plugin = await this.loadNpmPlugin(config.package);
        resolved = true;
      }
      
      return {
        plugin,
        config,
        resolved
      };
    } catch (error) {
      throw new Error(`Failed to load plugin "${config.name}" from "${config.package}": ${error instanceof Error ? error.message : error}`);
    }
  }

  private isLocalPath(packagePath: string): boolean {
    return packagePath.startsWith('./') || 
           packagePath.startsWith('../') || 
           path.isAbsolute(packagePath);
  }

  private async loadLocalPlugin(pluginPath: string): Promise<DotGitHubPlugin> {
    const resolvedPath = path.resolve(this.projectRoot, pluginPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Local plugin not found at: ${resolvedPath}`);
    }

    let modulePath: string;
    const stats = fs.statSync(resolvedPath);
    
    if (stats.isDirectory()) {
      const packageJsonPath = path.join(resolvedPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        modulePath = path.join(resolvedPath, packageJson.main || 'index.js');
      } else {
        modulePath = path.join(resolvedPath, 'index.js');
      }
    } else {
      modulePath = resolvedPath;
    }

    if (!fs.existsSync(modulePath)) {
      throw new Error(`Plugin entry point not found: ${modulePath}`);
    }

    const module: PluginModule = await import(modulePath);
    return this.extractPluginFromModule(module);
  }

  private async loadNpmPlugin(packageName: string): Promise<DotGitHubPlugin> {
    try {
      const module: PluginModule = await import(packageName);
      return this.extractPluginFromModule(module);
    } catch (error) {
      throw new Error(`Cannot resolve npm package "${packageName}". Make sure it's installed: npm install ${packageName}`);
    }
  }

  private extractPluginFromModule(module: PluginModule): DotGitHubPlugin {
    const plugin = module.default || module.plugin;
    
    if (!plugin) {
      throw new Error('Plugin module must export either a default export or named "plugin" export');
    }

    if (typeof plugin.apply !== 'function') {
      throw new Error('Plugin must implement the "apply" method');
    }

    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid "name" property');
    }

    return plugin;
  }

  async resolvePlugins(configs: PluginConfig[]): Promise<PluginLoadResult[]> {
    const results: PluginLoadResult[] = [];
    
    for (const config of configs) {
      if (config.enabled !== false) {
        results.push(await this.resolvePlugin(config));
      }
    }

    return results;
  }
}