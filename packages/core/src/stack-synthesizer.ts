import * as path from 'path';
import * as fs from 'fs';
import { GitHubStack } from './constructs/base.js';
import { PluginManager } from './plugins/manager.js';
// Removed import - using direct path resolution
import type {
  StackConfig,
  PluginConfig,
  PluginExecutionResult,
} from './plugins/types.js';
import type { DotGithubContext } from './context.js';

export interface StackSynthesizerOptions {
  context: DotGithubContext;
  projectRoot?: string;
  outputPath?: string;
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
  private readonly context: DotGithubContext;
  private readonly projectRoot: string;
  private readonly outputPath: string;
  private readonly pluginManager: PluginManager;

  constructor(options: StackSynthesizerOptions) {
    this.context = options.context;
    this.projectRoot = options.projectRoot || process.cwd();
    this.outputPath =
      options.outputPath || path.join(this.projectRoot, '.github');
    this.pluginManager = new PluginManager({
      projectRoot: this.projectRoot,
      context: this.context,
    });
  }

  async synthesizeAll(): Promise<SynthesisResults> {
    const config = this.context.config;
    const results: SynthesisResult[] = [];
    const errors: Error[] = [];

    if (!config.stacks || config.stacks.length === 0) {
      return {
        results: [],
        success: true,
        errors: [],
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
        errors,
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
      errors,
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

    return {
      stack,
      stackConfig,
      pluginResults,
      files,
      outputPath: this.outputPath,
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
        results.errors.push(
          error instanceof Error ? error : new Error(String(error))
        );
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

  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  getProjectRoot(): string {
    return this.projectRoot;
  }
}
