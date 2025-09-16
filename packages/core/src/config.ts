import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { PluginConfig, StackConfig } from './plugins/types';
import { globalPathResolver } from './path-resolver';

export interface DotGithubAction {
  /** GitHub repository in org/repo format */
  orgRepo: string;
  /** Git reference (resolved SHA) */
  ref: string;
  /** Original version reference that was requested (e.g., v4, main) */
  versionRef: string;
  /** Function name for the generated action (camelCase) */
  functionName: string;
  /** Output file path where the TypeScript was generated */
  outputPath: string;
  /** Path within the repository to the action (empty string for root) */
  actionPath?: string;
}

export interface DotGithubConfig {
  /** Version of the config file format */
  version: string;
  /** Default output directory for generated actions */
  outputDir: string;
  /** List of added actions */
  actions: DotGithubAction[];
  /** Plugin configurations */
  plugins?: PluginConfig[];
  /** Stack configurations */
  stacks?: StackConfig[];
  /** Additional configuration options */
  options?: {
    /** GitHub token source preference */
    tokenSource?: 'env' | 'config';
    /** Default formatting options */
    formatting?: {
      prettier?: boolean;
    };
  };
}

const CONFIG_VERSION = '1.0.0';
const DEFAULT_OUTPUT_DIR = 'src';


/**
 * Converts an absolute path to a relative path from the outputDir
 */
function makePathRelativeToOutputDir(absolutePath: string, outputDir?: string): string {
  return makeRelativeToOutput(absolutePath, outputDir);
}

/**
 * Converts a relative path from the outputDir to an absolute path
 */
export function resolvePathFromConfig(relativePath: string): string {
  return resolveFromOutput(relativePath);
}

/**
 * Gets the project root directory (parent of .github directory)
 */
export function getProjectRoot(): string {
  return globalPathResolver.getProjectRoot();
}

/**
 * Gets the config directory (.github directory)
 */
export function getConfigDir(): string {
  return globalPathResolver.getConfigDir();
}

/**
 * Gets the absolute path to the output directory
 */
export function getOutputDir(outputDir?: string): string {
  return globalPathResolver.getOutputDirAbsolute(outputDir);
}

/**
 * Converts an absolute path to a path relative to the config directory
 */
export function makeRelativeToConfig(absolutePath: string): string {
  return globalPathResolver.makePathRelativeToConfig(absolutePath);
}

/**
 * Converts an absolute path to a path relative to the output directory
 */
export function makeRelativeToOutput(absolutePath: string, outputDir?: string): string {
  return globalPathResolver.makePathRelativeToOutputDir(absolutePath, outputDir);
}

/**
 * Resolves a relative path from the output directory to an absolute path
 */
export function resolveFromOutput(relativePath: string, outputDir?: string): string {
  return globalPathResolver.resolvePathFromOutputDir(relativePath, outputDir);
}


/**
 * Gets the file format based on file extension
 */
function getConfigFormat(filePath: string): 'json' | 'js' | 'yaml' {
  const ext = path.extname(filePath);
  if (ext === '.js') return 'js';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  return 'json';
}

/**
 * Reads config content based on file format
 */
function readConfigContent(filePath: string, format: 'json' | 'js' | 'yaml'): DotGithubConfig {
  switch (format) {
    case 'json':
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(jsonContent);
    
    case 'yaml':
      const yamlContent = fs.readFileSync(filePath, 'utf8');
      return yaml.load(yamlContent) as DotGithubConfig;
    
    case 'js':
      // For JS files, we need to delete from require cache and then require
      delete require.cache[require.resolve(filePath)];
      const jsModule = require(filePath);
      // Support both default export and module.exports
      return jsModule.default || jsModule;
    
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }
}

/**
 * Writes config content based on file format
 */
function writeConfigContent(filePath: string, config: DotGithubConfig, format: 'json' | 'js' | 'yaml'): void {
  switch (format) {
    case 'json':
      const jsonContent = JSON.stringify(config, null, 2) + '\n';
      fs.writeFileSync(filePath, jsonContent, 'utf8');
      break;
    
    case 'yaml':
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
      fs.writeFileSync(filePath, yamlContent, 'utf8');
      break;
    
    case 'js':
      const jsContent = `// Generated dotgithub configuration
module.exports = ${JSON.stringify(config, null, 2)};
`;
      fs.writeFileSync(filePath, jsContent, 'utf8');
      break;
    
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }
}

/**
 * Sets a custom config file path to override the default discovery
 */
export function setConfigPath(configPath: string): void {
  globalPathResolver.setCustomConfigPath(configPath);
}

/**
 * Creates a config file in the specified format
 */
export function createConfigFile(format: 'json' | 'js' | 'yaml' | 'yml' = 'json', customPath?: string): string {
  const configDir = getConfigDir();
  
  // Map format to file extension
  const formatMap = {
    'json': 'json',
    'js': 'js', 
    'yaml': 'yaml',
    'yml': 'yml'
  };
  
  const fileName = `dotgithub.${formatMap[format]}`;
  const configPath = customPath || path.join(configDir, fileName);
  
  // Don't overwrite existing files
  if (fs.existsSync(configPath)) {
    throw new Error(`Config file already exists at: ${configPath}`);
  }
  
  const config = createDefaultConfig();
  const configFormat = getConfigFormat(configPath);
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  
  writeConfigContent(configPath, config, configFormat);
  return configPath;
}

/**
 * Gets the path to the dotgithub config file (supports .json, .js, .yaml, .yml)
 */
export function getConfigPath(): string {
  return globalPathResolver.getConfigPath();
}

/**
 * Creates a default config object
 */
export function createDefaultConfig(): DotGithubConfig {
  return {
    version: CONFIG_VERSION,
    outputDir: DEFAULT_OUTPUT_DIR,
    actions: [],
    plugins: [],
    stacks: [],
    options: {
      tokenSource: 'env',
      formatting: {
        prettier: true
      }
    }
  };
}

/**
 * Reads the dotgithub config file (supports .json, .js, .yaml, .yml)
 */
export function readConfig(customConfigPath?: string): DotGithubConfig {
  const configPath = customConfigPath || getConfigPath();
  
  if (!fs.existsSync(configPath)) {
    return createDefaultConfig();
  }
  
  try {
    const format = getConfigFormat(configPath);
    const config = readConfigContent(configPath, format);
    
    // Validate and migrate if necessary
    return validateAndMigrateConfig(config);
  } catch (error) {
    throw new Error(`Failed to read config file at ${configPath}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Writes the dotgithub config file (preserves existing format or defaults to JSON)
 */
export function writeConfig(config: DotGithubConfig): void {
  const configPath = getConfigPath();
  const configDir = getConfigDir();
  
  // Ensure .github directory exists
  fs.mkdirSync(configDir, { recursive: true });
  
  try {
    const format = getConfigFormat(configPath);
    writeConfigContent(configPath, config, format);
    // Invalidate cache since config changed
    globalPathResolver.invalidateCache();
  } catch (error) {
    throw new Error(`Failed to write config file at ${configPath}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Adds an action to the config
 */
export function addActionToConfig(actionInfo: DotGithubAction, outputDir?: string): void {
  const config = readConfig();
  
  // Check if action already exists (check orgRepo AND actionPath for uniqueness)
  const existingIndex = config.actions.findIndex(
    action => action.orgRepo === actionInfo.orgRepo &&
              (action.actionPath || '') === (actionInfo.actionPath || '')
  );
  
  const actionWithRelativePath: DotGithubAction = {
    ...actionInfo,
    outputPath: makePathRelativeToOutputDir(actionInfo.outputPath, outputDir)
  };
  
  if (existingIndex >= 0) {
    // Update existing action
    config.actions[existingIndex] = actionWithRelativePath;
  } else {
    // Add new action
    config.actions.push(actionWithRelativePath);
  }
  
  // Sort actions by orgRepo and then actionPath for consistent ordering
  config.actions.sort((a, b) => {
    const orgComparison = a.orgRepo.localeCompare(b.orgRepo);
    if (orgComparison !== 0) return orgComparison;
    return (a.actionPath || '').localeCompare(b.actionPath || '');
  });
  
  writeConfig(config);
}

/**
 * Removes an action from the config
 */
export function removeActionFromConfig(orgRepo: string): boolean {
  const config = readConfig();
  const originalLength = config.actions.length;
  
  // Remove the action for this org/repo (only one per org/repo allowed)
  config.actions = config.actions.filter(action => action.orgRepo !== orgRepo);
  
  if (config.actions.length !== originalLength) {
    writeConfig(config);
    return true;
  }
  
  return false;
}

/**
 * Gets all actions from the config
 */
export function getActionsFromConfig(): DotGithubAction[] {
  const config = readConfig();
  return config.actions;
}

/**
 * Gets all actions from the config with resolved absolute output paths
 */
export function getActionsFromConfigWithResolvedPaths(): (DotGithubAction & { resolvedOutputPath: string })[] {
  const config = readConfig();
  return config.actions.map(action => ({
    ...action,
    resolvedOutputPath: resolvePathFromConfig(action.outputPath)
  }));
}

/**
 * Gets a single action's resolved output path
 */
export function getResolvedOutputPath(action: DotGithubAction): string {
  return resolvePathFromConfig(action.outputPath);
}

/**
 * Updates the output directory in the config
 */
export function updateOutputDir(outputDir: string): void {
  const config = readConfig();
  config.outputDir = outputDir;
  writeConfig(config);
}

/**
 * Gets all plugins from the config
 */
export function getPluginsFromConfig(): PluginConfig[] {
  const config = readConfig();
  return config.plugins || [];
}

/**
 * Gets all stacks from the config
 */
export function getStacksFromConfig(): StackConfig[] {
  const config = readConfig();
  return config.stacks || [];
}

/**
 * Adds or updates a plugin in the config
 */
export function addPluginToConfig(pluginConfig: PluginConfig): void {
  const config = readConfig();
  if (!config.plugins) config.plugins = [];
  
  const existingIndex = config.plugins.findIndex(p => p.name === pluginConfig.name);
  
  if (existingIndex >= 0) {
    config.plugins[existingIndex] = pluginConfig;
  } else {
    config.plugins.push(pluginConfig);
  }
  
  config.plugins.sort((a, b) => a.name.localeCompare(b.name));
  writeConfig(config);
}

/**
 * Removes a plugin from the config
 */
export function removePluginFromConfig(pluginName: string): boolean {
  const config = readConfig();
  if (!config.plugins) return false;
  
  const originalLength = config.plugins.length;
  config.plugins = config.plugins.filter(p => p.name !== pluginName);
  
  if (config.plugins.length !== originalLength) {
    writeConfig(config);
    return true;
  }
  
  return false;
}

/**
 * Adds or updates a stack in the config
 */
export function addStackToConfig(stackConfig: StackConfig): void {
  const config = readConfig();
  if (!config.stacks) config.stacks = [];
  
  const existingIndex = config.stacks.findIndex(s => s.name === stackConfig.name);
  
  if (existingIndex >= 0) {
    config.stacks[existingIndex] = stackConfig;
  } else {
    config.stacks.push(stackConfig);
  }
  
  config.stacks.sort((a, b) => a.name.localeCompare(b.name));
  writeConfig(config);
}

/**
 * Removes a stack from the config
 */
export function removeStackFromConfig(stackName: string): boolean {
  const config = readConfig();
  if (!config.stacks) return false;
  
  const originalLength = config.stacks.length;
  config.stacks = config.stacks.filter(s => s.name !== stackName);
  
  if (config.stacks.length !== originalLength) {
    writeConfig(config);
    return true;
  }
  
  return false;
}

/**
 * Validates and migrates config to current version
 */
function validateAndMigrateConfig(config: any): DotGithubConfig {
  // Ensure required fields exist
  if (!config.version) config.version = CONFIG_VERSION;
  if (!config.outputDir) config.outputDir = DEFAULT_OUTPUT_DIR;
  if (!Array.isArray(config.actions)) config.actions = [];
  if (!Array.isArray(config.plugins)) config.plugins = [];
  if (!Array.isArray(config.stacks)) config.stacks = [];
  
  // Ensure options exist
  if (!config.options) {
    config.options = {
      tokenSource: 'env',
      formatting: { prettier: true }
    };
  }
  
  // Validate each action
  config.actions = config.actions.filter((action: any) => {
    return action.orgRepo && action.ref && action.versionRef && action.functionName;
  });
  
  // Validate each plugin
  config.plugins = config.plugins.filter((plugin: any) => {
    return plugin.name && plugin.package;
  });
  
  // Validate each stack
  config.stacks = config.stacks.filter((stack: any) => {
    return stack.name && Array.isArray(stack.plugins);
  });
  
  return config as DotGithubConfig;
}