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
  outputBasePath: string;

  constructor({ config, configPath }: DotGithubContextOptions) {
    this.config = config;
    this.configPath = configPath;
    this.outputBasePath = path.dirname(configPath);
  }

  resolvePath(relativePath: string): string {
    const outputDir = path.join(this.outputBasePath, this.config.outputDir);
    return path.resolve(outputDir, relativePath);
  }

  static fromConfig(configPath: string): DotGithubContext {
    const fullConfigPath = path.resolve(configPath);
    const config = readConfig(fullConfigPath);
    return new DotGithubContext({ config, configPath: fullConfigPath });
  }
}
