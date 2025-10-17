import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { PluginConfig, StackConfig } from './plugins/types.js';
import type { DotGithubContext } from './context.js';

export interface DotGithubAction {
  /** GitHub repository in org/repo format */
  orgRepo: string;
  /** Git reference (resolved SHA) */
  ref: string;
  /** Original version reference that was requested (e.g., v4, main) */
  versionRef: string;
  /** Action name for type names and function names (overrides default from YAML) */
  actionName?: string;
  /** Output file path where the TypeScript was generated - required when generateCode is true */
  outputPath?: string;
  /** Path within the repository to the action (empty string for root) */
  actionPath?: string;
  /** Whether to generate TypeScript code for this action (default: true) */
  generateCode?: boolean;
}

export interface DotGithubConfig {
  /** Version of the config file format */
  version: string;
  /** Root directory for generated actions */
  rootDir: string;
  /** Output directory for synth (relative to config file) */
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
const DEFAULT_ROOT_DIR = 'src';
const DEFAULT_OUTPUT_DIR = 'src';

/**
 * Converts an absolute path to a relative path from the rootDir
 */
function makePathRelativeToRootDir(
  absolutePath: string,
  rootDir: string
): string {
  return path.relative(rootDir, absolutePath);
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
function readConfigContent(
  filePath: string,
  format: 'json' | 'js' | 'yaml'
): DotGithubConfig {
  switch (format) {
    case 'json':
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(jsonContent);

    case 'yaml':
      const yamlContent = fs.readFileSync(filePath, 'utf8');
      return yaml.parse(yamlContent) as DotGithubConfig;

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
function writeConfigContent(
  filePath: string,
  config: DotGithubConfig,
  format: 'json' | 'js' | 'yaml'
): void {
  switch (format) {
    case 'json':
      const jsonContent = JSON.stringify(config, null, 2) + '\n';
      fs.writeFileSync(filePath, jsonContent, 'utf8');
      break;

    case 'yaml':
      const yamlContent = yaml.stringify(config, {
        indent: 2,
        lineWidth: 0,
        minContentWidth: 0,
        simpleKeys: false,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
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
  // This function is kept for compatibility but doesn't need to do anything
  // since we're using DotGithubContext now
}

/**
 * Creates a config file in the specified format
 */
export function createConfigFile(
  format: 'json' | 'js' | 'yaml' | 'yml' = 'json',
  customPath?: string
): string {
  const configDir = getConfigDir();

  // Map format to file extension
  const formatMap = {
    json: 'json',
    js: 'js',
    yaml: 'yaml',
    yml: 'yml',
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
  const CONFIG_FILE_NAMES = [
    'dotgithub.json',
    'dotgithub.js',
    'dotgithub.yaml',
    'dotgithub.yml',
  ];

  let currentDir = process.cwd();

  while (currentDir !== path.dirname(currentDir)) {
    const githubDir = path.join(currentDir, '.github');

    for (const fileName of CONFIG_FILE_NAMES) {
      const configPath = path.join(githubDir, fileName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    if (fs.existsSync(path.join(currentDir, '.git'))) {
      const defaultPath = path.join(
        currentDir,
        '.github',
        CONFIG_FILE_NAMES[0]!
      );
      return defaultPath;
    }

    currentDir = path.dirname(currentDir);
  }

  const defaultPath = path.join(
    process.cwd(),
    '.github',
    CONFIG_FILE_NAMES[0]!
  );
  return defaultPath;
}

/**
 * Gets the config directory (.github directory)
 */
export function getConfigDir(): string {
  const configPath = getConfigPath();
  return path.dirname(configPath);
}

/**
 * Creates a default config object
 */
export function createDefaultConfig(): DotGithubConfig {
  return {
    version: CONFIG_VERSION,
    rootDir: DEFAULT_ROOT_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    actions: [],
    plugins: [],
    stacks: [],
    options: {
      tokenSource: 'env',
      formatting: {
        prettier: true,
      },
    },
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
    const validatedConfig = validateAndMigrateConfig(config);

    // Automatically fix outputPath issues for existing configs
    const fixedConfig = validateAndFixOutputPaths(validatedConfig);

    // If we made changes, write the fixed config back
    if (fixedConfig !== validatedConfig) {
      writeConfig(fixedConfig, customConfigPath);
    }

    return fixedConfig;
  } catch (error) {
    throw new Error(
      `Failed to read config file at ${configPath}: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Writes the dotgithub config file (preserves existing format or defaults to JSON)
 */
export function writeConfig(
  config: DotGithubConfig,
  customConfigPath?: string
): void {
  const configPath = customConfigPath || getConfigPath();
  const configDir = getConfigDir();

  // Ensure .github directory exists
  fs.mkdirSync(configDir, { recursive: true });

  try {
    const format = getConfigFormat(configPath);
    writeConfigContent(configPath, config, format);
  } catch (error) {
    throw new Error(
      `Failed to write config file at ${configPath}: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Adds an action to the config
 */
export function addActionToConfig(
  actionInfo: DotGithubAction,
  context: DotGithubContext
): void {
  // Check if action already exists (check orgRepo AND actionPath for uniqueness)
  const existingIndex = context.config.actions.findIndex(
    (action) =>
      action.orgRepo === actionInfo.orgRepo &&
      (action.actionPath || '') === (actionInfo.actionPath || '')
  );

  const actionWithRelativePath: DotGithubAction = {
    ...actionInfo,
  };

  if (existingIndex >= 0) {
    // Update existing action
    context.config.actions[existingIndex] = actionWithRelativePath;
  } else {
    // Add new action
    context.config.actions.push(actionWithRelativePath);
  }

  // Sort actions by orgRepo and then actionPath for consistent ordering
  context.config.actions.sort((a, b) => {
    const orgComparison = a.orgRepo.localeCompare(b.orgRepo);
    if (orgComparison !== 0) return orgComparison;
    return (a.actionPath || '').localeCompare(b.actionPath || '');
  });

  writeConfig(context.config, context.configPath);
}

/**
 * Removes an action from the config
 */
export function removeActionFromConfig(orgRepo: string): boolean {
  const config = readConfig();
  const originalLength = config.actions.length;

  // Remove the action for this org/repo (only one per org/repo allowed)
  config.actions = config.actions.filter(
    (action) => action.orgRepo !== orgRepo
  );

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
export function getActionsFromConfigWithResolvedPaths(): (DotGithubAction & {
  resolvedOutputPath?: string;
})[] {
  const config = readConfig();
  const configDir = getConfigDir();
  const rootDir = path.join(configDir, config.rootDir);

  return config.actions.map((action) => ({
    ...action,
    ...(action.outputPath && {
      resolvedOutputPath: path.resolve(rootDir, action.outputPath),
    }),
  }));
}

/**
 * Gets a single action's resolved output path
 */
export function getResolvedOutputPath(
  action: DotGithubAction
): string | undefined {
  if (!action.outputPath) return undefined;

  const config = readConfig();
  const configDir = getConfigDir();
  const rootDir = path.join(configDir, config.rootDir);
  return path.resolve(rootDir, action.outputPath);
}

/**
 * Updates the root directory in the config
 */
export function updateRootDir(rootDir: string): void {
  const config = readConfig();
  config.rootDir = rootDir;
  writeConfig(config);
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
export function addPluginToConfig(
  pluginConfig: PluginConfig,
  customConfigPath?: string
): void {
  const config = readConfig(customConfigPath);
  if (!config.plugins) config.plugins = [];

  const existingIndex = config.plugins.findIndex(
    (p) => p.name === pluginConfig.name
  );

  if (existingIndex >= 0) {
    config.plugins[existingIndex] = pluginConfig;
  } else {
    config.plugins.push(pluginConfig);
  }

  config.plugins.sort((a, b) => a.name.localeCompare(b.name));
  writeConfig(config, customConfigPath);
}

/**
 * Removes a plugin from the config
 */
export function removePluginFromConfig(
  pluginName: string,
  customConfigPath?: string
): boolean {
  const config = readConfig(customConfigPath);
  if (!config.plugins) return false;

  const originalLength = config.plugins.length;
  config.plugins = config.plugins.filter((p) => p.name !== pluginName);

  if (config.plugins.length !== originalLength) {
    writeConfig(config, customConfigPath);
    return true;
  }

  return false;
}

/**
 * Adds or updates a stack in the config
 */
export function addStackToConfig(
  stackConfig: StackConfig,
  customConfigPath?: string
): void {
  const config = readConfig(customConfigPath);
  if (!config.stacks) config.stacks = [];

  const existingIndex = config.stacks.findIndex(
    (s) => s.name === stackConfig.name
  );

  if (existingIndex >= 0) {
    config.stacks[existingIndex] = stackConfig;
  } else {
    config.stacks.push(stackConfig);
  }

  config.stacks.sort((a, b) => a.name.localeCompare(b.name));
  writeConfig(config, customConfigPath);
}

/**
 * Removes a stack from the config
 */
export function removeStackFromConfig(
  stackName: string,
  customConfigPath?: string
): boolean {
  const config = readConfig(customConfigPath);
  if (!config.stacks) return false;

  const originalLength = config.stacks.length;
  config.stacks = config.stacks.filter((s) => s.name !== stackName);

  if (config.stacks.length !== originalLength) {
    writeConfig(config, customConfigPath);
    return true;
  }

  return false;
}

/**
 * Validates and fixes outputPath values in existing configs
 */
export function validateAndFixOutputPaths(
  config: DotGithubConfig
): DotGithubConfig {
  let hasChanges = false;

  config.actions = config.actions.map((action) => {
    if (action.outputPath && typeof action.outputPath === 'string') {
      // Check if the path goes outside the rootDir (starts with ../ or contains /../)
      if (
        action.outputPath.startsWith('../') ||
        action.outputPath.includes('/../')
      ) {
        console.warn(
          `⚠️  Fixing incorrect outputPath for ${action.orgRepo}: "${action.outputPath}"`
        );

        // Extract the filename and directory structure from the incorrect path
        const pathParts = action.outputPath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const dirParts = pathParts.slice(0, -1);

        // Find the part that starts after the rootDir structure
        const rootDirIndex = dirParts.findIndex(
          (part: string) => part === 'src' || part === config.rootDir
        );
        if (rootDirIndex >= 0) {
          // Take everything after the rootDir
          const correctedParts = dirParts.slice(rootDirIndex + 1);
          const correctedPath =
            correctedParts.length > 0
              ? `${correctedParts.join('/')}/${fileName}`
              : fileName;
          console.warn(`   Corrected to: "${correctedPath}"`);
          hasChanges = true;
          return { ...action, outputPath: correctedPath };
        } else {
          // If we can't find the rootDir in the path, just use the filename
          console.warn(`   Simplified to: "${fileName}"`);
          hasChanges = true;
          return { ...action, outputPath: fileName };
        }
      }
    }
    return action;
  });

  if (hasChanges) {
    console.log('✅ Fixed incorrect outputPath values in configuration');
  }

  return config;
}

/**
 * Validates and migrates config to current version
 */
function validateAndMigrateConfig(config: any): DotGithubConfig {
  // Ensure required fields exist
  if (!config.version) config.version = CONFIG_VERSION;
  if (!config.rootDir) config.rootDir = DEFAULT_ROOT_DIR;
  if (!config.outputDir) config.outputDir = DEFAULT_OUTPUT_DIR;
  if (!Array.isArray(config.actions)) config.actions = [];
  if (!Array.isArray(config.plugins)) config.plugins = [];
  if (!Array.isArray(config.stacks)) config.stacks = [];

  // Ensure options exist
  if (!config.options) {
    config.options = {
      tokenSource: 'env',
      formatting: { prettier: true },
    };
  }

  // Validate each action
  config.actions = config.actions.filter((action: any) => {
    return action.orgRepo && action.ref && action.versionRef;
  });

  // Fix incorrect outputPath values that go outside the rootDir
  config.actions = config.actions.map((action: any) => {
    if (action.outputPath && typeof action.outputPath === 'string') {
      // Check if the path goes outside the rootDir (starts with ../ or contains /../)
      if (
        action.outputPath.startsWith('../') ||
        action.outputPath.includes('/../')
      ) {
        console.warn(
          `⚠️  Fixing incorrect outputPath for ${action.orgRepo}: "${action.outputPath}"`
        );

        // Extract the filename and directory structure from the incorrect path
        const pathParts = action.outputPath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const dirParts = pathParts.slice(0, -1);

        // Find the part that starts after the rootDir structure
        const rootDirIndex = dirParts.findIndex(
          (part: string) => part === 'src' || part === config.rootDir
        );
        if (rootDirIndex >= 0) {
          // Take everything after the rootDir
          const correctedParts = dirParts.slice(rootDirIndex + 1);
          action.outputPath =
            correctedParts.length > 0
              ? `${correctedParts.join('/')}/${fileName}`
              : fileName;
          console.warn(`   Corrected to: "${action.outputPath}"`);
        } else {
          // If we can't find the rootDir in the path, just use the filename
          action.outputPath = fileName;
          console.warn(`   Simplified to: "${action.outputPath}"`);
        }
      }
    }
    return action;
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

/**
 * Sets a pinned action for a specific scope (plugin or stack)
 */
export function setPinnedAction(
  action: string,
  ref: string,
  scope: { plugin?: string; stack?: string },
  context: DotGithubContext
): void {
  if (!scope.plugin && !scope.stack) {
    throw new Error('Must specify either plugin or stack scope');
  }

  if (scope.plugin && scope.stack) {
    throw new Error('Cannot specify both plugin and stack scope');
  }

  const config = context.config;

  if (scope.plugin) {
    // Find the plugin and update its actions
    const pluginIndex = config.plugins?.findIndex(
      (p) => p.name === scope.plugin
    );
    if (pluginIndex === undefined || pluginIndex === -1) {
      throw new Error(`Plugin "${scope.plugin}" not found`);
    }

    if (!config.plugins) {
      throw new Error('Plugins configuration not found');
    }

    if (!config.plugins[pluginIndex]!.actions) {
      config.plugins[pluginIndex]!.actions = {};
    }

    config.plugins[pluginIndex]!.actions![action] = ref;
  } else if (scope.stack) {
    // Find the stack and update its actions
    const stackIndex = config.stacks?.findIndex((s) => s.name === scope.stack);
    if (stackIndex === undefined || stackIndex === -1) {
      throw new Error(`Stack "${scope.stack}" not found`);
    }

    if (!config.stacks) {
      throw new Error('Stacks configuration not found');
    }

    if (!config.stacks[stackIndex]!.actions) {
      config.stacks[stackIndex]!.actions = {};
    }

    config.stacks[stackIndex]!.actions![action] = ref;
  }

  writeConfig(config, context.configPath);
}

/**
 * Removes a pinned action from a specific scope (plugin or stack)
 */
export function removePinnedAction(
  action: string,
  scope: { plugin?: string; stack?: string },
  context: DotGithubContext
): boolean {
  if (!scope.plugin && !scope.stack) {
    throw new Error('Must specify either plugin or stack scope');
  }

  if (scope.plugin && scope.stack) {
    throw new Error('Cannot specify both plugin and stack scope');
  }

  const config = context.config;
  let removed = false;

  if (scope.plugin) {
    // Find the plugin and remove the action
    const pluginIndex = config.plugins?.findIndex(
      (p) => p.name === scope.plugin
    );
    if (pluginIndex === undefined || pluginIndex === -1) {
      throw new Error(`Plugin "${scope.plugin}" not found`);
    }

    if (!config.plugins) {
      throw new Error('Plugins configuration not found');
    }

    if (
      config.plugins[pluginIndex]!.actions &&
      config.plugins[pluginIndex]!.actions![action]
    ) {
      delete config.plugins[pluginIndex]!.actions![action];
      removed = true;
    }
  } else if (scope.stack) {
    // Find the stack and remove the action
    const stackIndex = config.stacks?.findIndex((s) => s.name === scope.stack);
    if (stackIndex === undefined || stackIndex === -1) {
      throw new Error(`Stack "${scope.stack}" not found`);
    }

    if (!config.stacks) {
      throw new Error('Stacks configuration not found');
    }

    if (
      config.stacks[stackIndex]!.actions &&
      config.stacks[stackIndex]!.actions![action]
    ) {
      delete config.stacks[stackIndex]!.actions![action];
      removed = true;
    }
  }

  if (removed) {
    writeConfig(config, context.configPath);
  }

  return removed;
}

/**
 * Gets all pinned actions for a specific scope (plugin or stack)
 */
export function getPinnedActions(
  scope: { plugin?: string; stack?: string },
  context: DotGithubContext
): Record<string, string> {
  if (!scope.plugin && !scope.stack) {
    throw new Error('Must specify either plugin or stack scope');
  }

  if (scope.plugin && scope.stack) {
    throw new Error('Cannot specify both plugin and stack scope');
  }

  const config = context.config;

  if (scope.plugin) {
    // Find the plugin and return its actions
    const plugin = config.plugins?.find((p) => p.name === scope.plugin);
    if (!plugin) {
      throw new Error(`Plugin "${scope.plugin}" not found`);
    }

    return plugin.actions || {};
  } else if (scope.stack) {
    // Find the stack and return its actions
    const stack = config.stacks?.find((s) => s.name === scope.stack);
    if (!stack) {
      throw new Error(`Stack "${scope.stack}" not found`);
    }

    return stack.actions || {};
  }

  return {};
}

/**
 * Gets all pinned actions across all scopes
 */
export function getAllPinnedActions(context: DotGithubContext): {
  plugins: Record<string, Record<string, string>>;
  stacks: Record<string, Record<string, string>>;
} {
  const config = context.config;
  const result = {
    plugins: {} as Record<string, Record<string, string>>,
    stacks: {} as Record<string, Record<string, string>>,
  };

  // Collect plugin actions
  if (config.plugins) {
    for (const plugin of config.plugins) {
      if (plugin.actions && Object.keys(plugin.actions).length > 0) {
        result.plugins[plugin.name] = plugin.actions;
      }
    }
  }

  // Collect stack actions
  if (config.stacks) {
    for (const stack of config.stacks) {
      if (stack.actions && Object.keys(stack.actions).length > 0) {
        result.stacks[stack.name] = stack.actions;
      }
    }
  }

  return result;
}
