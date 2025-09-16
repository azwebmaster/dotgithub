import path from 'node:path';
import { readConfig, type DotGithubConfig } from './config.js';

export type DotGithubContextOptions = {
  config: DotGithubConfig;
  configPath: string;
};

export class DotGithubContext {
  /** The dotgithub configuration */
  config: DotGithubConfig;
  configPath: string;
  outputPath: string;

  constructor({ config, configPath }: DotGithubContextOptions) {
    this.config = config;
    this.configPath = configPath;
    this.outputPath = path.join(path.dirname(configPath), this.config.outputDir);
  }

  resolvePath(relativePath: string): string {
    return path.resolve(this.outputPath, relativePath);
  }

  relativePath(absolutePath: string): string {
    console.log(`Calculating relative path from ${this.outputPath} to ${absolutePath}`);
    return path.relative(this.outputPath, absolutePath);
  }

  static fromConfig(configPath: string): DotGithubContext {
    const fullConfigPath = path.resolve(configPath);
    const config = readConfig(fullConfigPath);
    return new DotGithubContext({ config, configPath: fullConfigPath });
  }
}
