import * as path from 'path';
import * as fs from 'fs';
import type {
  ConstructConfig,
  ConstructModule,
  GitHubConstruct,
  ConstructLoadResult,
} from './types.js';
// Removed import - using direct path resolution
import type { DotGithubContext } from '../context.js';

export class ConstructResolver {
  constructor(
    private readonly projectRoot: string,
    private readonly context?: DotGithubContext
  ) {}

  async resolveConstruct(config: ConstructConfig): Promise<ConstructLoadResult> {
    let construct: GitHubConstruct;
    let resolved = false;

    try {
      if (this.isLocalPath(config.package)) {
        construct = await this.loadLocalConstruct(config.package);
        resolved = true;
      } else {
        construct = await this.loadNpmConstruct(config.package);
        resolved = true;
      }

      return {
        construct,
        config,
        resolved,
      };
    } catch (error) {
      throw new Error(
        `Failed to load construct "${config.name}" from "${config.package}": ${error instanceof Error ? error.message : error}`
      );
    }
  }

  private isLocalPath(packagePath: string): boolean {
    return (
      packagePath.startsWith('./') ||
      packagePath.startsWith('../') ||
      path.isAbsolute(packagePath) ||
      // Also consider paths with file extensions as local paths
      path.extname(packagePath) !== '' ||
      // Consider paths that don't look like npm package names as local
      !this.isValidNpmPackageName(packagePath)
    );
  }

  private isValidNpmPackageName(packageName: string): boolean {
    // Basic npm package name validation
    // Package names should be lowercase, can contain hyphens, and should not start with dots
    return (
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(packageName) ||
      /^@[a-z0-9][a-z0-9-]*[a-z0-9]\/[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(
        packageName
      )
    );
  }

  private async loadLocalConstruct(
    constructPath: string
  ): Promise<GitHubConstruct> {
    // Resolve construct path using formula: {configDir}/{rootDir}/{constructPackage}
    let resolvedPath: string;
    if (this.context) {
      // Use the formula: configDir + rootDir + constructPackage
      const configDir = path.dirname(this.context.configPath);
      const rootDir = this.context.config.rootDir;
      resolvedPath = path.resolve(configDir, rootDir, constructPath);
    } else {
      // Fallback to old behavior - resolve relative to project root
      resolvedPath = path.resolve(this.projectRoot, constructPath);
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Local construct not found at: ${resolvedPath}`);
    }

    let modulePath: string;
    const stats = fs.statSync(resolvedPath);

    if (stats.isDirectory()) {
      const packageJsonPath = path.join(resolvedPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );
        modulePath = path.join(resolvedPath, packageJson.main || 'index.js');
      } else {
        modulePath = path.join(resolvedPath, 'index.js');
      }
    } else {
      modulePath = resolvedPath;
    }

    if (!fs.existsSync(modulePath)) {
      throw new Error(`Construct entry point not found: ${modulePath}`);
    }

    const module: ConstructModule = await import(modulePath);
    return this.extractConstructFromModule(module);
  }

  private async loadNpmConstruct(
    packageName: string
  ): Promise<GitHubConstruct> {
    try {
      const module: ConstructModule = await import(packageName);
      return this.extractConstructFromModule(module);
    } catch (error) {
      throw new Error(
        `Cannot resolve npm package "${packageName}". Make sure it's installed: npm install ${packageName}`
      );
    }
  }

  private extractConstructFromModule(
    module: ConstructModule
  ): GitHubConstruct {
    const construct = module.default || module.construct;

    if (!construct) {
      throw new Error(
        'Construct module must export either a default export or named "construct" export'
      );
    }

    if (typeof construct.synthesize !== 'function') {
      throw new Error('Construct must implement the "synthesize" method');
    }

    if (!construct.name || typeof construct.name !== 'string') {
      throw new Error('Construct must have a valid "name" property');
    }

    return construct;
  }

  async resolveConstructs(
    configs: ConstructConfig[]
  ): Promise<ConstructLoadResult[]> {
    const results: ConstructLoadResult[] = [];

    for (const config of configs) {
      if (config.enabled !== false) {
        results.push(await this.resolveConstruct(config));
      }
    }

    return results;
  }
}
