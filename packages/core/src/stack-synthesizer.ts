import * as path from 'path';
import * as fs from 'fs';
import { GitHubStack } from './constructs/base';
import { PluginManager } from './plugins/manager';
import { getConfigPath, readConfig } from './config';
import type { 
  StackConfig, 
  PluginConfig, 
  PluginExecutionResult
} from './plugins/types';

export interface StackSynthesizerOptions {
  projectRoot?: string;
  configPath?: string;
  outputDir?: string;
}

export interface SynthesisResult {
  stack: GitHubStack;
  stackConfig: StackConfig;
  pluginResults: PluginExecutionResult[];
  files: Record<string, string>;
  outputPath: string;
}

export interface SynthesisResults {
  results: SynthesisResult[];
  success: boolean;
  errors: Error[];
}

export class StackSynthesizer {
  private readonly projectRoot: string;
  private readonly pluginManager: PluginManager;

  constructor(options: StackSynthesizerOptions = {}) {
    this.projectRoot = options.projectRoot || this.findProjectRoot(options.configPath);
    this.pluginManager = new PluginManager({
      projectRoot: this.projectRoot
    });
  }

  async synthesizeAll(): Promise<SynthesisResults> {
    const config = readConfig();
    const results: SynthesisResult[] = [];
    const errors: Error[] = [];

    if (!config.stacks || config.stacks.length === 0) {
      return {
        results: [],
        success: true,
        errors: []
      };
    }

    // Load all plugins first
    const pluginConfigs = config.plugins || [];
    try {
      await this.pluginManager.loadPlugins(pluginConfigs);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
      return {
        results: [],
        success: false,
        errors
      };
    }

    // Synthesize each stack
    for (const stackConfig of config.stacks) {
      try {
        const result = await this.synthesizeStack(stackConfig, pluginConfigs);
        results.push(result);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    return {
      results,
      success: errors.length === 0,
      errors
    };
  }

  async synthesizeStack(
    stackConfig: StackConfig,
    pluginConfigs: PluginConfig[]
  ): Promise<SynthesisResult> {
    // Create a new stack instance
    const stack = new GitHubStack(undefined, stackConfig.name);

    // Execute plugins on the stack
    const pluginResults = await this.pluginManager.executePluginsForStack(
      stack,
      stackConfig,
      pluginConfigs
    );

    // Generate files from the stack
    const files = stack.synth();

    // Determine output path
    const config = readConfig();
    const outputPath = path.join(
      this.projectRoot,
      '.github'
    );

    return {
      stack,
      stackConfig,
      pluginResults,
      files,
      outputPath
    };
  }

  async synthesizeAndWrite(): Promise<SynthesisResults> {
    const results = await this.synthesizeAll();

    if (!results.success) {
      return results;
    }

    // Write all synthesized files
    for (const result of results.results) {
      try {
        await this.writeStackFiles(result);
      } catch (error) {
        results.errors.push(error instanceof Error ? error : new Error(String(error)));
        results.success = false;
      }
    }

    return results;
  }

  private async writeStackFiles(result: SynthesisResult): Promise<void> {
    const { files, outputPath, stackConfig } = result;

    // Ensure output directory exists
    fs.mkdirSync(outputPath, { recursive: true });

    // Write each file
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(outputPath, filename);
      const fileDir = path.dirname(filePath);

      // Ensure parent directory exists
      fs.mkdirSync(fileDir, { recursive: true });

      // Write the file
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  private findProjectRoot(configPath?: string): string {
    if (configPath) {
      return path.dirname(path.dirname(configPath));
    }

    const detectedConfigPath = getConfigPath();
    const configDir = path.dirname(detectedConfigPath);
    
    // If config is in .github directory, project root is parent
    if (path.basename(configDir) === '.github') {
      return path.dirname(configDir);
    }
    
    // Otherwise, config directory is the project root
    return configDir;
  }

  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  getProjectRoot(): string {
    return this.projectRoot;
  }
}