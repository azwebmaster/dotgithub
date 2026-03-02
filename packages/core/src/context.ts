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
  rootPath: string;
  outputPath: string;

  constructor({ config, configPath }: DotGithubContextOptions) {
    this.config = config;
    this.configPath = configPath;
    const rootDir = this.config.rootDir ?? this.config.outputDir ?? 'src';
    this.rootPath = path.join(path.dirname(configPath), rootDir);
    this.outputPath = this.rootPath;
  }

  resolvePath(relativePath: string): string {
    return path.resolve(this.rootPath, relativePath);
  }

  relativePath(absolutePath: string): string {
    return path.relative(this.rootPath, absolutePath);
  }

  static fromConfig(configPath: string): DotGithubContext {
    const fullConfigPath = path.resolve(configPath);
    const config = readConfig(fullConfigPath);
    return new DotGithubContext({ config, configPath: fullConfigPath });
  }
}
