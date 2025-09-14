import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE_NAMES = ['dotgithub.json', 'dotgithub.js', 'dotgithub.yaml', 'dotgithub.yml'];

interface PathCache {
  configPath?: string;
  configDir?: string;
  configDirResolved?: string;
  projectRoot?: string;
  outputDir?: string;
  outputDirResolved?: string;
}

export class PathResolver {
  private cache: PathCache = {};
  private customConfigPath?: string;

  setCustomConfigPath(configPath: string | undefined): void {
    this.customConfigPath = configPath ? path.resolve(configPath) : undefined;
    this.invalidateCache();
  }

  getConfigPath(): string {
    if (this.cache.configPath) {
      return this.cache.configPath;
    }

    if (this.customConfigPath) {
      this.cache.configPath = this.customConfigPath;
      return this.customConfigPath;
    }

    let currentDir = process.cwd();
    
    while (currentDir !== path.dirname(currentDir)) {
      const githubDir = path.join(currentDir, '.github');
      
      for (const fileName of CONFIG_FILE_NAMES) {
        const configPath = path.join(githubDir, fileName);
        if (fs.existsSync(configPath)) {
          this.cache.configPath = configPath;
          return configPath;
        }
      }
      
      if (fs.existsSync(path.join(currentDir, '.git'))) {
        const defaultPath = path.join(currentDir, '.github', CONFIG_FILE_NAMES[0]!);
        this.cache.configPath = defaultPath;
        return defaultPath;
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    const defaultPath = path.join(process.cwd(), '.github', CONFIG_FILE_NAMES[0]!);
    this.cache.configPath = defaultPath;
    return defaultPath;
  }

  getConfigDir(): string {
    if (this.cache.configDir) {
      return this.cache.configDir;
    }

    const configPath = this.getConfigPath();
    this.cache.configDir = path.dirname(configPath);
    return this.cache.configDir;
  }

  getConfigDirResolved(): string {
    if (this.cache.configDirResolved) {
      return this.cache.configDirResolved;
    }

    const configDir = this.getConfigDir();
    
    try {
      this.cache.configDirResolved = fs.realpathSync(configDir);
    } catch (err) {
      fs.mkdirSync(configDir, { recursive: true });
      this.cache.configDirResolved = fs.realpathSync(configDir);
    }
    
    return this.cache.configDirResolved;
  }

  getProjectRoot(): string {
    if (this.cache.projectRoot) {
      return this.cache.projectRoot;
    }

    const configDir = this.getConfigDir();
    
    if (path.basename(configDir) === '.github') {
      this.cache.projectRoot = path.dirname(configDir);
    } else {
      this.cache.projectRoot = configDir;
    }
    
    return this.cache.projectRoot;
  }

  getOutputDirAbsolute(outputDir?: string): string {
    const cacheKey = outputDir || 'default';
    
    if (outputDir) {
      const configDir = this.getConfigDir();
      return path.resolve(configDir, outputDir);
    }

    if (this.cache.outputDir) {
      return this.cache.outputDir;
    }

    const config = this.getConfigForPath();
    const configDir = this.getConfigDir();
    this.cache.outputDir = path.resolve(configDir, config.outputDir);
    return this.cache.outputDir;
  }

  getOutputDirResolved(outputDir?: string): string {
    if (outputDir) {
      return path.normalize(this.getOutputDirAbsolute(outputDir));
    }

    if (this.cache.outputDirResolved) {
      return this.cache.outputDirResolved;
    }

    this.cache.outputDirResolved = path.normalize(this.getOutputDirAbsolute());
    return this.cache.outputDirResolved;
  }

  makePathRelativeToConfig(absolutePath: string): string {
    const resolvedConfigDir = this.getConfigDirResolved();
    
    let resolvedAbsolutePath: string;
    try {
      const absoluteDir = path.dirname(absolutePath);
      const fileName = path.basename(absolutePath);
      const resolvedAbsoluteDir = fs.realpathSync(absoluteDir);
      resolvedAbsolutePath = path.join(resolvedAbsoluteDir, fileName);
    } catch (err) {
      const absoluteDir = path.dirname(absolutePath);
      const fileName = path.basename(absolutePath);
      fs.mkdirSync(absoluteDir, { recursive: true });
      const resolvedAbsoluteDir = fs.realpathSync(absoluteDir);
      resolvedAbsolutePath = path.join(resolvedAbsoluteDir, fileName);
    }
    
    return path.relative(resolvedConfigDir, resolvedAbsolutePath);
  }

  makePathRelativeToOutputDir(absolutePath: string, outputDir?: string): string {
    const outputDirAbsolute = this.getOutputDirAbsolute(outputDir);
    const normalizedOutputDir = path.normalize(outputDirAbsolute);
    const normalizedAbsolutePath = path.normalize(absolutePath);
    
    return path.relative(normalizedOutputDir, normalizedAbsolutePath);
  }

  resolvePathFromOutputDir(relativePath: string, outputDir?: string): string {
    const outputDirAbsolute = this.getOutputDirAbsolute(outputDir);
    return path.resolve(outputDirAbsolute, relativePath);
  }

  invalidateCache(): void {
    this.cache = {};
  }

  private getConfigForPath(): { outputDir: string } {
    const configPath = this.getConfigPath();
    
    if (!fs.existsSync(configPath)) {
      return { outputDir: 'src' };
    }
    
    try {
      const format = this.getConfigFormat(configPath);
      const config = this.readConfigContent(configPath, format);
      return { outputDir: config.outputDir || 'src' };
    } catch (error) {
      return { outputDir: 'src' };
    }
  }

  private getConfigFormat(filePath: string): 'json' | 'js' | 'yaml' {
    const ext = path.extname(filePath);
    if (ext === '.js') return 'js';
    if (ext === '.yaml' || ext === '.yml') return 'yaml';
    return 'json';
  }

  private readConfigContent(filePath: string, format: 'json' | 'js' | 'yaml'): any {
    switch (format) {
      case 'json':
        const jsonContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(jsonContent);
      
      case 'yaml':
        const yaml = require('js-yaml');
        const yamlContent = fs.readFileSync(filePath, 'utf8');
        return yaml.load(yamlContent);
      
      case 'js':
        delete require.cache[require.resolve(filePath)];
        const jsModule = require(filePath);
        return jsModule.default || jsModule;
      
      default:
        throw new Error(`Unsupported config format: ${format}`);
    }
  }
}

const globalPathResolver = new PathResolver();
export { globalPathResolver };