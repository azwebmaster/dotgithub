import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { format } from 'prettier';
import { cloneRepo } from './git.js';
import { getDefaultBranch } from './github.js';
import type { DotGithubContext } from './context.js';
import { Project, SourceFile, ClassDeclaration, MethodDeclaration, PropertyDeclaration } from 'ts-morph';
import { generateActionFiles } from './actions-manager.js';

// Enhanced TypeScript interfaces for better type safety
interface WorkflowSchema {
  name?: string;
  on: Record<string, any>;
  jobs: Record<string, JobSchema>;
  env?: Record<string, string>;
  permissions?: Record<string, string>;
}

interface JobSchema {
  'runs-on': string;
  needs?: string | string[];
  steps: (StepSchema | FunctionCallObject)[];
  env?: Record<string, string>;
  strategy?: {
    matrix?: Record<string, any>;
    'fail-fast'?: boolean;
  };
  permissions?: Record<string, string>;
}

interface StepSchema {
  name?: string;
  id?: string;
  uses?: string;
  with?: Record<string, any>;
  run?: string;
  env?: Record<string, string>;
  if?: string;
  'continue-on-error'?: boolean;
}

interface ActionConfig {
  orgRepo: string;
  functionName: string;
  outputPath: string;
  ref?: string;
  generateCode?: boolean;
}

interface ActionImport {
  functionName: string;
  outputPath: string;
}

interface CoreFunctionUsage {
  createStep: boolean;
  run: boolean;
}

interface Config {
  actions?: ActionConfig[];
  outputDir?: string;
}

interface FunctionCallObject {
  __functionCall: boolean;
  __functionName: string;
  __functionInputs: Record<string, any>;
  [key: string]: any;
}

export interface GeneratePluginFromGitHubFilesOptions {
  pluginName: string;
  source: string; // Local path, GitHub repo (org/repo@ref format), or GitHub URL to file
  description?: string;
  overwrite?: boolean;
  context: DotGithubContext; // Required context for config access and output directory resolution
  autoAddActions?: boolean; // Automatically add actions found in workflows
  token?: string; // GitHub token for auto-adding actions
}

export interface GeneratePluginFromGitHubFilesResult {
  pluginPath: string;
  pluginName: string;
  filesFound: string[];
  generatedContent: string;
  generatedFiles: GeneratedPluginFile[];
}

export interface GeneratedPluginFile {
  path: string;
  content: string;
  type: 'main' | 'workflow' | 'resource';
  name: string;
}

export interface CreatePluginFromFilesOptions {
  pluginName: string;
  githubFilesPath: string;
  description?: string;
  outputDir?: string;
  context: DotGithubContext; // Required context for config access
  autoAddActions?: boolean;
  token?: string;
}

export interface CreatePluginFromFilesResult {
  pluginContent: string;
  filesFound: string[];
  generatedFiles: GeneratedPluginFile[];
}

/**
 * Creates plugin content from .github files in a directory
 * @throws {Error} When path validation or file processing fails
 */
export async function createPluginFromFiles(options: CreatePluginFromFilesOptions): Promise<CreatePluginFromFilesResult> {
  const { pluginName, githubFilesPath, description = `Plugin generated from .github files`, outputDir, context, autoAddActions = false, token } = options;
  
  // Validate plugin name
  if (!pluginName || pluginName.trim().length === 0) {
    throw new Error('Plugin name is required and cannot be empty');
  }
  
  // Validate path exists and is accessible
  if (!githubFilesPath || githubFilesPath.trim().length === 0) {
    throw new Error('GitHub files path is required and cannot be empty');
  }
  
  let stats: fs.Stats;
  try {
    if (!fs.existsSync(githubFilesPath)) {
      throw new Error(`Path does not exist: ${githubFilesPath}`);
    }
    
    stats = fs.statSync(githubFilesPath);
  } catch (error) {
    throw new Error(`Failed to access path ${githubFilesPath}: ${error instanceof Error ? error.message : error}`);
  }
  
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${githubFilesPath}`);
  }

  // Recursively collect all files from the .github directory
  let files: FileEntry[];
  try {
    files = collectFilesRecursively(githubFilesPath);
  } catch (error) {
    throw new Error(`Failed to collect files from ${githubFilesPath}: ${error instanceof Error ? error.message : error}`);
  }
  
  const filesFound = files.map(f => f.relativePath);

  if (files.length === 0) {
    throw new Error(`No files found in: ${githubFilesPath}`);
  }

  // Auto-add actions if requested (do this BEFORE plugin generation)
  if (autoAddActions && files.length > 0) {
    console.log(`🔍 Scanning workflows for actions to auto-add...`);
    
    // Extract actions from workflow files
    const workflowFiles = files.filter(f => f.relativePath.startsWith('workflows/') && (f.relativePath.endsWith('.yml') || f.relativePath.endsWith('.yaml')));
    if (workflowFiles.length > 0) {
      const actions = extractActionsFromWorkflows(workflowFiles);
      
      if (actions.size > 0) {
        console.log(`   Found ${actions.size} unique actions to add: ${Array.from(actions).join(', ')}`);
        const addedActions = await autoAddActionsToConfig(context, actions, token);
        console.log(`   Successfully added ${addedActions.length} actions`);
      } else {
        console.log(`   No actions found in workflows`);
      }
    }
  }

  // Check if there's a local dotgithub.json config in the source directory
  let configToUse = context.config;
  const localConfigPath = path.join(githubFilesPath, 'dotgithub.json');
  if (fs.existsSync(localConfigPath)) {
    try {
      const localConfigContent = fs.readFileSync(localConfigPath, 'utf8');
      const localConfig = JSON.parse(localConfigContent);
      configToUse = localConfig;
      console.log(`   Using local config from ${localConfigPath}`);
    } catch (error) {
      console.warn(`   Warning: Could not parse local config at ${localConfigPath}:`, error);
    }
  }

  // Generate plugin content (now with updated config that includes auto-added actions)
  // Filter actions to only include those with functionName for code generation
  const configForPlugin: Config = {
    actions: configToUse.actions
      .filter(action => action.generateCode !== false && action.outputPath)
      .map(action => {
        const { generateFunctionName } = require('./utils');
        const functionName = action.actionName ? generateFunctionName(action.actionName) : action.orgRepo;
        return {
          orgRepo: action.orgRepo,
          ref: action.ref,
          versionRef: action.versionRef,
          functionName,
          outputPath: action.outputPath!,
          actionPath: action.actionPath,
          generateCode: action.generateCode
        };
      }),
    outputDir: configToUse.outputDir
  };
  
  let pluginResult: { mainContent: string; generatedFiles: GeneratedPluginFile[] };
  try {
    pluginResult = await generatePluginCode(pluginName, description, files, outputDir, configForPlugin);
  } catch (error) {
    throw new Error(`Failed to generate plugin code: ${error instanceof Error ? error.message : error}`);
  }
  
  return {
    pluginContent: pluginResult.mainContent,
    filesFound,
    generatedFiles: pluginResult.generatedFiles
  };
}

/**
 * Generates a plugin from .github files (local path or GitHub repo)
 */
export async function generatePluginFromGitHubFiles(options: GeneratePluginFromGitHubFilesOptions): Promise<GeneratePluginFromGitHubFilesResult> {
  const { pluginName, source, description, overwrite = false, context, autoAddActions = false, token } = options;
  
  // Use context to resolve path relative to configured output directory
  const finalOutputDir = context.resolvePath('plugins');
  
  // Determine if source is a local path, GitHub repo, or GitHub file URL
  let result: CreatePluginFromFilesResult;
  let tempDir: string | null = null;
  
  if (isGitHubFileUrl(source)) {
    // Handle GitHub file URL
    const { content, filename } = await downloadGitHubFile(source);
    // Filter actions to only include those with outputPath for code generation
    const configForPlugin: Config = {
      actions: context.config.actions
        .filter(action => action.generateCode !== false && action.outputPath)
        .map(action => {
          const { generateFunctionName } = require('./utils');
          const functionName = action.actionName ? generateFunctionName(action.actionName) : action.orgRepo;
          return {
            orgRepo: action.orgRepo,
            ref: action.ref,
            versionRef: action.versionRef,
            functionName,
            outputPath: action.outputPath!,
            actionPath: action.actionPath,
            generateCode: action.generateCode
          };
        }),
      outputDir: context.config.outputDir
    };
    result = await createPluginFromSingleFile(pluginName, filename, content, description, finalOutputDir, configForPlugin);
  } else if (isGitHubRepo(source)) {
    // Clone GitHub repo and extract .github files
    const { orgRepo, ref } = parseGitHubRepo(source);
    const [owner, repo] = orgRepo.split('/');
    
    if (!owner || !repo) {
      throw new Error('GitHub repo must be in the format owner/repo or owner/repo@ref');
    }
    
    const token = process.env.GITHUB_TOKEN;
    let resolvedRef = ref;
    
    if (!resolvedRef) {
      resolvedRef = await getDefaultBranch(owner, repo, token);
    }
    
    // Create temp directory and clone repo
    tempDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-plugin-'));
    const url = token
      ? `https://${token}:x-oauth-basic@github.com/${owner}/${repo}.git`
      : `https://github.com/${owner}/${repo}.git`;
      
    const cloneOptions: Record<string, any> = { '--depth': 1 };
    if (resolvedRef) cloneOptions['--branch'] = resolvedRef;
    
    await cloneRepo(url, tempDir, cloneOptions);
    const githubFilesPath = path.join(tempDir, '.github');
    
    if (!fs.existsSync(githubFilesPath)) {
      throw new Error(`No .github directory found in ${orgRepo}${ref ? `@${ref}` : ''}`);
    }
    
    // Create plugin from files
    result = await createPluginFromFiles({
      pluginName,
      githubFilesPath,
      description,
      outputDir: finalOutputDir,
      context,
      autoAddActions,
      token
    });
  } else {
    // Use local path
    let githubFilesPath = path.resolve(source);
    
    // If the source doesn't end with .github, append it
    if (!githubFilesPath.endsWith('.github')) {
      githubFilesPath = path.join(githubFilesPath, '.github');
    }
    
    // Create plugin from files
    result = await createPluginFromFiles({
      pluginName,
      githubFilesPath,
      description,
      outputDir: finalOutputDir,
      context,
      autoAddActions,
      token
    });
  }
  
  try {
    // Use the finalOutputDir that was already calculated
    const outputPath = path.resolve(finalOutputDir);
    const pluginDir = path.join(outputPath, pluginName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase());
    
    try {
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }
      
      // Create subdirectories for workflows and resources
      const workflowsDir = path.join(pluginDir, 'workflows');
      const resourcesDir = path.join(pluginDir, 'resources');
      
      if (!fs.existsSync(workflowsDir)) {
        fs.mkdirSync(workflowsDir, { recursive: true });
      }
      if (!fs.existsSync(resourcesDir)) {
        fs.mkdirSync(resourcesDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create output directory ${pluginDir}: ${error instanceof Error ? error.message : error}`);
    }
    
    // Generate main plugin file path
    const fileName = 'index.ts';
    const pluginPath = path.resolve(pluginDir, fileName);
    
    // Check if main plugin file exists and handle overwrite
    if (fs.existsSync(pluginPath) && !overwrite) {
      throw new Error(`Plugin file already exists: ${pluginPath}. Use --overwrite to replace it.`);
    }
    
    // Write main plugin file with proper error handling
    try {
      fs.writeFileSync(pluginPath, result.pluginContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write plugin file ${pluginPath}: ${error instanceof Error ? error.message : error}`);
    }
    
    // Write individual workflow and resource files
    const generatedFiles: GeneratedPluginFile[] = [];
    for (const file of result.generatedFiles) {
      try {
        // Ensure the directory exists
        const fileDir = path.dirname(file.path);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        fs.writeFileSync(file.path, file.content, 'utf8');
        generatedFiles.push(file);
      } catch (error) {
        console.warn(`Warning: Failed to write file ${file.path}: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    return {
      pluginPath,
      pluginName,
      filesFound: result.filesFound,
      generatedContent: result.pluginContent,
      generatedFiles
    };
    
  } catch (error) {
    // Ensure cleanup happens even if an error occurs
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn(`Warning: Failed to cleanup temp directory ${tempDir}: ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
      }
    }
    throw error;
  } finally {
    // Clean up temp directory if we created one (backup cleanup)
    if (tempDir) {
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(`Warning: Failed to cleanup temp directory ${tempDir}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
}

// Helper functions

/**
 * Downloads content from a GitHub URL using the GitHub API
 * @param url - The GitHub URL to download from
 * @returns Promise resolving to file content and filename
 * @throws {Error} When URL parsing or API request fails
 */
async function downloadGitHubFile(url: string): Promise<{ content: string; filename: string }> {
  const githubFileInfo = parseGitHubFileUrl(url);
  if (!githubFileInfo) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  
  const { owner, repo, ref, filePath } = githubFileInfo;
  const token = process.env.GITHUB_TOKEN;
  
  // Use GitHub API to get file content
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}${ref ? `?ref=${ref}` : ''}`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3.raw',
    'User-Agent': 'dotgithub-cli'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  try {
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to download file from GitHub: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    const filename = path.basename(filePath);
    
    return { content, filename };
  } catch (error) {
    throw new Error(`Failed to download file from ${url}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Creates plugin content from a single GitHub file
 * @param pluginName - Name of the plugin to generate
 * @param filename - Name of the source file
 * @param content - Content of the source file
 * @param description - Optional description for the plugin
 * @param outputDir - Optional output directory for relative imports
 * @param config - Optional config for action replacement
 * @returns Plugin generation result with content and file list
 */
async function createPluginFromSingleFile(pluginName: string, filename: string, content: string, description?: string, outputDir?: string, config: Config | null = null): Promise<CreatePluginFromFilesResult> {
  // Check if this is a workflow file (ends with .yaml or .yml)
  const isWorkflowFile = filename.endsWith('.yaml') || filename.endsWith('.yml');
  
  // If it's a workflow file, treat it as if it's in the workflows/ directory
  const relativePath = isWorkflowFile ? `workflows/${filename}` : filename;
  
  const fileEntry: FileEntry = {
    relativePath,
    fullPath: filename,
    content
  };
  
  const pluginResult = await generatePluginCode(
    pluginName, 
    description || `Plugin generated from ${filename}`, 
    [fileEntry],
    outputDir,
    config
  );
  
  return {
    pluginContent: pluginResult.mainContent,
    filesFound: [relativePath],
    generatedFiles: pluginResult.generatedFiles
  };
}

interface FileEntry {
  relativePath: string;
  fullPath: string;
  content: string;
}

/**
 * Recursively collects all files from a directory
 * @param dirPath The directory to collect files from
 * @param basePath The base path for relative file paths
 * @returns Array of file entries with content
 * @throws {Error} When file access fails
 */
function collectFilesRecursively(dirPath: string, basePath = ''): FileEntry[] {
  const files: FileEntry[] = [];
  
  let items: string[];
  try {
    items = fs.readdirSync(dirPath);
  } catch (error) {
    throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : error}`);
  }
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const relativePath = path.posix.join(basePath, item); // Use posix for consistent path separators
    
    let stats: fs.Stats;
    try {
      stats = fs.statSync(itemPath);
    } catch (error) {
      console.warn(`Warning: Could not stat ${itemPath}, skipping: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    
    if (stats.isDirectory()) {
      // Skip the 'src' directory to avoid including plugin source files
      if (item === 'src') {
        continue;
      }
      
      // Recursively collect files from subdirectories
      try {
        files.push(...collectFilesRecursively(itemPath, relativePath));
      } catch (error) {
        console.warn(`Warning: Could not process directory ${itemPath}: ${error instanceof Error ? error.message : error}`);
        continue;
      }
    } else if (stats.isFile()) {
      // Read file content
      try {
        const content = fs.readFileSync(itemPath, 'utf8');
        files.push({
          relativePath,
          fullPath: itemPath,
          content
        });
      } catch (error) {
        console.warn(`Warning: Could not read file ${itemPath}, skipping: ${error instanceof Error ? error.message : error}`);
        continue;
      }
    }
  }
  
  return files;
}

/**
 * Formats an array value to a properly indented code string
 */
function formatArrayToCode(value: any[], indent: number): string {
  if (value.length === 0) return '[]';
  const spaces = '  '.repeat(indent);
  const items = value.map(item => `${spaces}  ${valueToCodeString(item, indent + 1)}`);
  return `[\n${items.join(',\n')}\n${spaces}]`;
}

/**
 * Formats a function call object to a TypeScript function call
 */
function formatFunctionCallToCode(value: FunctionCallObject, indent: number): string {
  const inputs = value.__functionInputs || {};
  const { __functionCall, __functionName, __functionInputs, ...stepOptions } = value;

  const hasInputs = Object.keys(inputs).length > 0;
  const hasStepOptions = Object.keys(stepOptions).length > 0;

  // Special handling for run function - it takes name as first param, script as second, step options as third
  if (value.__functionName === 'run') {
    const script = inputs.script;
    const name = inputs.name || 'Run';
    if (!hasStepOptions) {
      return `run(${JSON.stringify(name)}, ${JSON.stringify(script)})`;
    } else {
      const stepOptionsCode = valueToCodeString(stepOptions, indent);
      return `run(${JSON.stringify(name)}, ${JSON.stringify(script)}, ${stepOptionsCode})`;
    }
  }

  if (!hasInputs && !hasStepOptions) {
    return `${value.__functionName}()`;
  } else if (hasInputs && !hasStepOptions) {
    const inputsCode = valueToCodeString(inputs, indent);
    return `${value.__functionName}(${inputsCode})`;
  } else if (!hasInputs && hasStepOptions) {
    const stepOptionsCode = valueToCodeString(stepOptions, indent);
    return `${value.__functionName}({}, ${stepOptionsCode})`;
  } else {
    const inputsCode = valueToCodeString(inputs, indent);
    const stepOptionsCode = valueToCodeString(stepOptions, indent);
    return `${value.__functionName}(${inputsCode}, ${stepOptionsCode})`;
  }
}

/**
 * Formats an object to a properly indented code string
 */
function formatObjectToCode(value: Record<string, any>, indent: number): string {
  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  
  const spaces = '  '.repeat(indent);
  const entries = keys.map(key => {
    const keyString = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    return `${spaces}  ${keyString}: ${valueToCodeString(value[key], indent + 1)}`;
  });
  
  return `{\n${entries.join(',\n')}\n${spaces}}`;
}

/**
 * Converts a JavaScript value to a properly formatted TypeScript code string
 */
function valueToCodeString(value: any, indent = 0): string {
  // Handle primitive values
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  
  // Handle arrays
  if (Array.isArray(value)) {
    return formatArrayToCode(value, indent);
  }
  
  // Handle objects
  if (typeof value === 'object') {
    // Handle special function call objects
    if (value.__functionCall && value.__functionName) {
      return formatFunctionCallToCode(value as FunctionCallObject, indent);
    }
    
    return formatObjectToCode(value, indent);
  }
  
  return 'undefined';
}

/**
 * Processes a workflow to replace 'uses' statements with action function calls during generation time
 * @param workflow - The workflow schema to process
 * @param config - Configuration containing action mappings
 * @param actionImports - Set to collect required action imports
 * @param coreFunctionUsage - Object to track usage of core functions like createStep and run
 * @returns Processed workflow schema with function calls
 */
function processWorkflowForGeneration(workflow: WorkflowSchema, config: Config | null, actionImports: Set<ActionImport>, coreFunctionUsage: CoreFunctionUsage): WorkflowSchema {
  if (!config || !config.actions || !workflow.jobs) {
    return workflow;
  }

  const processedWorkflow: WorkflowSchema = { ...workflow };
  
  // Process each job in the workflow
  for (const [jobId, job] of Object.entries(processedWorkflow.jobs)) {
    if (!job.steps) continue;
    
    const processedSteps = job.steps.map((step: StepSchema | FunctionCallObject) => {
      return processStepForGeneration(step as StepSchema, config, actionImports, coreFunctionUsage);
    });
    
    processedWorkflow.jobs[jobId] = {
      ...job,
      steps: processedSteps
    };
  }
  
  return processedWorkflow;
}


/**
 * Processes a single step to replace 'uses' with action function call during generation time
 * @param step - The workflow step to process
 * @param config - Configuration containing action mappings
 * @param actionImports - Set to collect required action imports
 * @param coreFunctionUsage - Object to track usage of core functions like createStep and run
 * @returns Either the original step or a function call object
 */
function processStepForGeneration(step: StepSchema, config: Config, actionImports: Set<ActionImport>, coreFunctionUsage: CoreFunctionUsage): StepSchema | FunctionCallObject {
  // Handle run steps - convert to run() function call
  if (step.run) {
    const { run: script, ...stepOptions } = step;
    
    // Track that run function is used
    coreFunctionUsage.run = true;
    
    // Create a special object that represents the run function call
    const runCallStep: FunctionCallObject = {
      ...stepOptions,
      __functionCall: true,
      __functionName: 'run',
      __functionInputs: { script }
    };
    
    return runCallStep;
  }
  
  if (!step.uses) {
    return step;
  }

  // Extract org/repo from uses (e.g., "actions/checkout@v4" -> "actions/checkout")
  const usesMatch = step.uses.match(/^([^@]+)@/);
  if (!usesMatch) {
    return step;
  }
  
  const orgRepo = usesMatch[1];
  
  // Look up action in config
  const action = config.actions?.find((a: ActionConfig) => a.orgRepo === orgRepo);
  if (!action) {
    return step;
  }

  // Check if action is enabled for code generation
  if (action.generateCode === false) {
    // Use createStep for actions that are not enabled for code generation
    const { uses, with: inputs, ...stepOptions } = step;
    
    // Track that createStep function is used
    coreFunctionUsage.createStep = true;
    
    // Create a special object that represents the createStep function call
    const createStepCall: FunctionCallObject = {
      ...stepOptions,
      __functionCall: true,
      __functionName: 'createStep',
      __functionInputs: { 
        uses: orgRepo, 
        step: { with: inputs },
        ref: action.ref 
      }
    };
    
    return createStepCall;
  }

  // Add function name and output path to imports for generated action functions
  // Use the functionName as a key to avoid duplicates
  // Only add if the action has the required fields for code generation
  if (action.functionName && action.outputPath) {
    const existing = Array.from(actionImports).find(item => item.functionName === action.functionName);
    if (!existing) {
      actionImports.add({ functionName: action.functionName, outputPath: action.outputPath });
    }
  }
  
  // Replace uses step with function call
  // Map 'with' options to function inputs, preserve other step properties
  const { uses, with: inputs, ...stepOptions } = step;
  
  // Use inputs as-is since we no longer store input metadata in config
  const formattedInputs = inputs || {};
  
  // Create a special object that represents the function call
  // This will be serialized by valueToCodeString as a function call
  const functionCallStep: FunctionCallObject = {
    ...stepOptions,
    __functionCall: true,
    __functionName: action.functionName!,
    __functionInputs: formattedInputs
  };
  
  return functionCallStep;
}

/**
 * Separates workflow files from other files based on path patterns
 * @param files - Array of file entries to process
 * @returns Object containing separated workflow and other files
 */
function separateWorkflowFromOtherFiles(files: FileEntry[]): { workflowFiles: FileEntry[]; otherFiles: FileEntry[] } {
  const workflowFiles = files.filter(file => 
    file.relativePath.startsWith('workflows/') && 
    (file.relativePath.endsWith('.yml') || file.relativePath.endsWith('.yaml'))
  );
  const otherFiles = files.filter(file => 
    !(file.relativePath.startsWith('workflows/') && 
      (file.relativePath.endsWith('.yml') || file.relativePath.endsWith('.yaml')))
  );
  
  return { workflowFiles, otherFiles };
}

/**
 * Generates imports for workflow files
 * @param actionImports - Set of action imports to include
 * @param outputDir - Output directory for relative import paths
 * @returns Generated import statements for workflow files
 */
function generateWorkflowImports(actionImports: Set<ActionImport>, outputDir?: string): string {
  if (actionImports.size === 0) {
    return '';
  }

  // Generate individual import statements for each action based on its outputPath
  const actionImportArray = Array.from(actionImports).sort((a, b) => a.functionName.localeCompare(b.functionName));
  
  const imports: string[] = [];
  
  for (const actionImport of actionImportArray) {
    let importPath = actionImport.outputPath;
    
    if (outputDir) {
      // The action outputPath is relative to the config's output directory (e.g., "actions/owner/action-name.ts")
      // The workflow will be in a workflows subdirectory (e.g., "plugins/plugin-name/workflows/workflow-name.ts")
      // So we need to go up three levels to get to src/, then into the actions directory
      importPath = '../../../' + actionImport.outputPath;
      
      // Convert to forward slashes
      importPath = importPath.replace(/\\/g, '/');
      
      // Remove .ts extension and add .js for import
      if (importPath.endsWith('.ts')) {
        importPath = importPath.slice(0, -3) + '.js';
      }
    } else {
      // If no outputDir provided, use the path as-is but ensure it's a relative import
      importPath = importPath.replace(/\\/g, '/');
      if (!importPath.startsWith('.')) {
        importPath = './' + importPath;
      }
      
      // Remove .ts extension and add .js for import
      if (importPath.endsWith('.ts')) {
        importPath = importPath.slice(0, -3) + '.js';
      }
    }
    
    imports.push(`import { ${actionImport.functionName} } from '${importPath}';`);
  }
  
  return imports.length > 0 ? imports.join('\n') + '\n\n' : '';
}

/**
 * Generates import statements for the plugin based on files and actions
 * @param hasWorkflows - Whether the plugin has workflow files
 * @param actionImports - Set of action function names to import
 * @param coreFunctionUsage - Object tracking usage of core functions like createStep and run
 * @param outputDir - Directory where the plugin will be output
 * @returns Import statements as a string
 */
function generateImports(hasWorkflows: boolean, actionImports: Set<ActionImport>, coreFunctionUsage: CoreFunctionUsage, outputDir?: string): string {
  // Create a new ts-morph project for code generation
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 5, // ES2022
      module: 1, // CommonJS
      declaration: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
  });

  const fileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName);

  // Add core imports
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@dotgithub/core',
    namedImports: ['DotGitHubPlugin', 'PluginContext'],
    isTypeOnly: true,
  });
  
  // Add core function imports if they are used
  const coreFunctionImports: string[] = [];
  if (coreFunctionUsage.createStep) {
    coreFunctionImports.push('createStep');
  }
  if (coreFunctionUsage.run) {
    coreFunctionImports.push('run');
  }
  
  if (coreFunctionImports.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: coreFunctionImports,
    });
  }
  
  // Add GitHubWorkflows import if we have workflows
  if (hasWorkflows) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: ['GitHubWorkflows', 'GitHubWorkflow'],
      isTypeOnly: true,
    });
  }
  
  // Add action imports if we have any
  if (actionImports.size > 0) {
    // Generate individual import statements for each action based on its outputPath
    const actionImportArray = Array.from(actionImports).sort((a, b) => a.functionName.localeCompare(b.functionName));
    
    for (const actionImport of actionImportArray) {
      let importPath = actionImport.outputPath;
      
      if (outputDir) {
        // The action outputPath is relative to the config's output directory (e.g., "actions/owner/action-name.ts")
        // The plugin will be in a plugins subdirectory (e.g., "plugins/plugin-name.ts")
        // So we need to go up one level and then into the actions directory
        importPath = '../' + actionImport.outputPath;
        
        // Convert to forward slashes
        importPath = importPath.replace(/\\/g, '/');
        
        // Remove .ts extension and add .js for import
        if (importPath.endsWith('.ts')) {
          importPath = importPath.slice(0, -3) + '.js';
        }
      } else {
        // If no outputDir provided, use the path as-is but ensure it's a relative import
        importPath = importPath.replace(/\\/g, '/');
        if (!importPath.startsWith('.')) {
          importPath = './' + importPath;
        }
        
        // Remove .ts extension and add .js for import
        if (importPath.endsWith('.ts')) {
          importPath = importPath.slice(0, -3) + '.js';
        }
      }
      
      sourceFile.addImportDeclaration({
        moduleSpecifier: importPath,
        namedImports: [actionImport.functionName],
      });
    }
  }
  
  return sourceFile.getFullText();
}

/**
 * Generates individual workflow files
 * @param workflowFiles - Array of workflow files to process
 * @param config - Configuration object for action replacement
 * @param actionImports - Set to collect action function names for imports
 * @param pluginName - Name of the plugin
 * @param outputDir - Output directory for the plugin
 * @returns Array of generated workflow files
 */
async function generateWorkflowFiles(
  workflowFiles: FileEntry[], 
  config: Config | null, 
  actionImports: Set<ActionImport>,
  pluginName: string,
  outputDir: string
): Promise<{ generatedFiles: GeneratedPluginFile[]; allActionImports: Set<ActionImport>; coreFunctionUsage: CoreFunctionUsage }> {
  const generatedFiles: GeneratedPluginFile[] = [];
  const allActionImports: Set<ActionImport> = new Set();
  const coreFunctionUsage: CoreFunctionUsage = { createStep: false, run: false };
  
  for (const file of workflowFiles) {
    const workflowName = path.basename(file.relativePath, path.extname(file.relativePath));
    const fileName = `${workflowName}.ts`;
    const filePath = path.join(outputDir, 'workflows', fileName);
    
    try {
      const parsedWorkflow = yaml.parse(file.content) as any;
      
      // Create a separate actionImports set for this specific workflow
      const workflowActionImports: Set<ActionImport> = new Set();
      const workflowCoreFunctionUsage: CoreFunctionUsage = { createStep: false, run: false };
      const processedWorkflow = processWorkflowForGeneration(parsedWorkflow, config, workflowActionImports, workflowCoreFunctionUsage);
      const workflowCode = valueToCodeString(processedWorkflow, 0);
      
      // Merge core function usage
      if (workflowCoreFunctionUsage.createStep) {
        coreFunctionUsage.createStep = true;
      }
      if (workflowCoreFunctionUsage.run) {
        coreFunctionUsage.run = true;
      }
      
      // Add this workflow's actions to the overall collection
      for (const actionImport of workflowActionImports) {
        allActionImports.add(actionImport);
      }
      
      // Generate imports for this workflow file using only its specific actions
      const workflowImports = generateWorkflowImports(workflowActionImports, outputDir);
      
      const rawContent = `${workflowImports}import { run } from '@dotgithub/core';
import type { PluginContext } from '@dotgithub/core';

/**
 * ${workflowName} workflow handler
 * Generated from: ${file.relativePath}
 */
export async function ${toCamelCase(workflowName)}Handler(context: PluginContext): Promise<void> {
  const { stack } = context;
  
  stack.addWorkflow('${workflowName}', ${workflowCode});
}
`;
      
      const formattedContent = await formatCode(rawContent);
      
      generatedFiles.push({
        path: filePath,
        content: formattedContent,
        type: 'workflow',
        name: workflowName
      });
    } catch (error) {
      console.warn(`Warning: Could not parse YAML in ${file.relativePath}, falling back to string:`, error);
      const escapedContent = JSON.stringify(file.content);
      
      // Generate imports for this workflow file (even for fallback case)
      const workflowImports = generateWorkflowImports(actionImports, outputDir);
      
      const rawContent = `${workflowImports}import type { GitHubWorkflow, PluginContext } from '@dotgithub/core';

/**
 * ${workflowName} workflow handler
 * Generated from: ${file.relativePath}
 */
export async function ${toCamelCase(workflowName)}Handler(context: PluginContext): Promise<void> {
  const { stack } = context;
  
  stack.addWorkflow('${workflowName}', ${escapedContent});
}
`;
      
      const formattedContent = await formatCode(rawContent);
      
      generatedFiles.push({
        path: filePath,
        content: formattedContent,
        type: 'workflow',
        name: workflowName
      });
    }
  }
  
  return { generatedFiles, allActionImports, coreFunctionUsage };
}

/**
 * Generates individual resource files
 * @param otherFiles - Array of non-workflow files to process
 * @param pluginName - Name of the plugin
 * @param outputDir - Output directory for the plugin
 * @returns Array of generated resource files
 */
async function generateResourceFiles(
  otherFiles: FileEntry[],
  pluginName: string,
  outputDir: string
): Promise<GeneratedPluginFile[]> {
  const generatedFiles: GeneratedPluginFile[] = [];
  
  for (const file of otherFiles) {
    const resourceName = path.basename(file.relativePath, path.extname(file.relativePath));
    const fileName = `${resourceName}.ts`;
    const filePath = path.join(outputDir, 'resources', fileName);
    
    const escapedPath = file.relativePath.replace(/\\/g, '/');
    
    // Try to parse YAML files for better code generation
    let resourceCode: string;
    if (file.relativePath.endsWith('.yml') || file.relativePath.endsWith('.yaml')) {
      try {
        const parsedYaml = yaml.parse(file.content) as any;
        resourceCode = valueToCodeString(parsedYaml, 0);
      } catch (error) {
        console.warn(`Warning: Could not parse YAML in ${file.relativePath}, using as string:`, error);
        resourceCode = JSON.stringify(file.content);
      }
    } else {
      resourceCode = JSON.stringify(file.content);
    }
    
    const rawContent = `import type { PluginContext } from '@dotgithub/core';

/**
 * ${resourceName} resource handler
 * Generated from: ${file.relativePath}
 */
export async function ${toCamelCase(resourceName)}Handler(context: PluginContext): Promise<void> {
  const { stack } = context;
  
  stack.addResource('${escapedPath}', { content: ${resourceCode} });
}
`;
    
    const formattedContent = await formatCode(rawContent);
    
    generatedFiles.push({
      path: filePath,
      content: formattedContent,
      type: 'resource',
      name: resourceName
    });
  }
  
  return generatedFiles;
}

/**
 * Generates workflow-related methods for the plugin class
 * @param workflowFiles - Array of workflow files to process
 * @param config - Configuration object for action replacement
 * @param actionImports - Set to collect action function names for imports
 * @returns Object containing applyWorkflows method
 */
function generateWorkflowMethods(
  workflowFiles: FileEntry[], 
  config: Config | null, 
  actionImports: Set<ActionImport>
): { applyWorkflowsMethod: string } {
  const hasWorkflows = workflowFiles.length > 0;
  
  // Generate applyWorkflows method
  let applyWorkflowsMethod: string;
  if (hasWorkflows) {
    applyWorkflowsMethod = `  async applyWorkflows(context: PluginContext): Promise<void> {
    ${workflowFiles.map(file => {
      const workflowName = path.basename(file.relativePath, path.extname(file.relativePath));
      const importName = toCamelCase(workflowName) + 'Handler';
      return `await ${importName}(context);`;
    }).join('\n    ')}
  }`;
  } else {
    applyWorkflowsMethod = `  async applyWorkflows(_context: PluginContext): Promise<void> {
    // This plugin doesn't define any workflows
  }`;
  }
  
  return { applyWorkflowsMethod };
}

/**
 * Generates resource-related methods for the plugin class
 * @param otherFiles - Array of non-workflow files to process
 * @returns Object containing applyResources method
 */
function generateResourceMethods(otherFiles: FileEntry[]): { applyResourcesMethod: string } {
  const hasOtherFiles = otherFiles.length > 0;
  
  // Generate applyResources method
  let applyResourcesMethod: string;
  if (hasOtherFiles) {
    applyResourcesMethod = `  async applyResources(context: PluginContext): Promise<void> {
    ${otherFiles.map(file => {
      const resourceName = path.basename(file.relativePath, path.extname(file.relativePath));
      const importName = toCamelCase(resourceName) + 'Handler';
      return `await ${importName}(context);`;
    }).join('\n    ')}
  }`;
  } else {
    applyResourcesMethod = `  async applyResources(_context: PluginContext): Promise<void> {
    // This plugin doesn't define any resources
  }`;
  }
  
  return { applyResourcesMethod };
}

/**
 * Generates the main class definition for the plugin
 * @param pluginName - Name of the plugin
 * @param description - Description of the plugin
 * @param files - Array of all files included in the plugin
 * @param className - PascalCase class name
 * @param imports - Import statements string
 * @param applyWorkflowsMethod - Apply workflows method code
 * @param applyResourcesMethod - Apply resources method code
 * @param generatedFiles - Array of generated individual files
 * @returns Complete class definition as string
 */
async function generateClassDefinition(
  pluginName: string,
  description: string,
  files: FileEntry[],
  className: string,
  imports: string,
  applyWorkflowsMethod: string,
  applyResourcesMethod: string,
  generatedFiles: GeneratedPluginFile[]
): Promise<string> {
  const escapedDescription = description.replace(/'/g, "\\'");
  
  // Generate imports for workflow and resource files
  const workflowImports: string[] = [];
  const resourceImports: string[] = [];
  
  for (const file of generatedFiles) {
    if (file.type === 'workflow') {
      const importName = toCamelCase(file.name) + 'Handler';
      workflowImports.push(`import { ${importName} } from './workflows/${file.name}.js';`);
    } else if (file.type === 'resource') {
      const importName = toCamelCase(file.name) + 'Handler';
      resourceImports.push(`import { ${importName} } from './resources/${file.name}.js';`);
    }
  }
  
  // Generate main synthesize method that calls the other two
  const synthesizeMethod = `  async synthesize(context: PluginContext): Promise<void> {
    await this.applyWorkflows(context);
    await this.applyResources(context);
  }`;
  
  // No need for inline workflow and resource objects since we're using separate files
  
  const rawContent = `${imports}
${workflowImports.join('\n')}
${resourceImports.join('\n')}

/**
 * ${escapedDescription}
 * 
 * This plugin was auto-generated from .github files.
 * Files included: ${files.map(f => f.relativePath).join(', ')}
 */
export class ${className} implements DotGitHubPlugin {
  readonly name = '${pluginName}';
  readonly version = '1.0.0';
  readonly description = '${escapedDescription}';

${applyWorkflowsMethod}

${applyResourcesMethod}

${synthesizeMethod}
}

// Export as default for easier importing
export default new ${className}();
`;

  return await formatCode(rawContent);
}

/**
 * Generates plugin code from a set of .github files
 * @param pluginName - Name of the plugin to generate
 * @param description - Description of the plugin
 * @param files - Array of file entries containing .github files
 * @param outputDir - Optional output directory for import path calculation
 * @param config - Optional config for action replacement, or null to skip replacement
 * @returns Generated TypeScript plugin code and individual files
 */
async function generatePluginCode(pluginName: string, description: string, files: FileEntry[], outputDir?: string, config: Config | null = null): Promise<{ mainContent: string; generatedFiles: GeneratedPluginFile[] }> {
  const className = toPascalCase(pluginName) + 'Plugin';
  
  // Separate workflow files from other files
  const { workflowFiles, otherFiles } = separateWorkflowFromOtherFiles(files);
  
  // Use the provided config for available actions for uses replacement
  const actionImports: Set<ActionImport> = new Set();

  // Generate individual workflow and resource files
  // Note: outputDir here should be the plugin directory, not the parent directory
  const resolvedOutputDir = outputDir ? path.resolve(outputDir) : '';
  const pluginDir = resolvedOutputDir ? path.join(resolvedOutputDir, pluginName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()) : '';
  
  const { generatedFiles: workflowFiles_generated, allActionImports, coreFunctionUsage } = await generateWorkflowFiles(workflowFiles, config, actionImports, pluginName, pluginDir);
  const resourceFiles_generated = await generateResourceFiles(otherFiles, pluginName, pluginDir);
  
  // Generate workflow methods for the main plugin file using all collected actions
  const { applyWorkflowsMethod } = generateWorkflowMethods(workflowFiles, config, allActionImports);
  
  // Generate resource methods for the main plugin file
  const { applyResourcesMethod } = generateResourceMethods(otherFiles);
  
  // Generate imports for the main plugin file using all collected actions
  const hasWorkflows = workflowFiles.length > 0;
  const hasOtherFiles = otherFiles.length > 0;
  const imports = generateImports(hasWorkflows, allActionImports, coreFunctionUsage, outputDir);
  
  // Generate complete class definition
  const mainContent = await generateClassDefinition(
    pluginName,
    description,
    files,
    className,
    imports,
    applyWorkflowsMethod,
    applyResourcesMethod,
    [...workflowFiles_generated, ...resourceFiles_generated]
  );
  
  return {
    mainContent,
    generatedFiles: [...workflowFiles_generated, ...resourceFiles_generated]
  };
}

/**
 * Determines if a source string represents a GitHub repository reference
 * @param source - Source string to check (e.g., "owner/repo" or "owner/repo@ref")
 * @returns True if source appears to be a GitHub repo reference
 */
function isGitHubRepo(source: string): boolean {
  // Simple check: contains slash and doesn't start with . or /, and is not a URL
  return source.includes('/') && !source.startsWith('.') && !source.startsWith('/') && !isGitHubFileUrl(source);
}

/**
 * Determines if a source string is a GitHub file URL
 * @param source - Source string to check
 * @returns True if source is a GitHub blob URL
 */
function isGitHubFileUrl(source: string): boolean {
  return source.startsWith('https://github.com/') && source.includes('/blob/');
}

interface GitHubFileInfo {
  owner: string;
  repo: string;
  ref: string;
  filePath: string;
}

/**
 * Parses a GitHub file URL into its component parts
 * @param url - GitHub blob URL to parse
 * @returns Parsed file information or null if invalid
 * @example parseGitHubFileUrl('https://github.com/owner/repo/blob/main/path/file.yml')
 */
function parseGitHubFileUrl(url: string): GitHubFileInfo | null {
  // Parse URLs like: https://github.com/actions/starter-workflows/blob/main/ci/npm-publish.yml
  const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/);
  
  if (!match || match.length < 5) {
    return null;
  }
  
  const owner = match[1];
  const repo = match[2];
  const ref = match[3];
  const filePath = match[4];
  
  if (!owner || !repo || !ref || !filePath) {
    return null;
  }
  
  return { owner, repo, ref, filePath };
}

/**
 * Parses a GitHub repository reference into org/repo and optional ref
 * @param source - Repository string in format "owner/repo" or "owner/repo@ref"
 * @returns Object with orgRepo and optional ref
 * @example parseGitHubRepo('actions/checkout@v4') // { orgRepo: 'actions/checkout', ref: 'v4' }
 */
function parseGitHubRepo(source: string): { orgRepo: string; ref?: string } {
  const atIndex = source.lastIndexOf('@');
  if (atIndex === -1) {
    return { orgRepo: source };
  }
  return {
    orgRepo: source.substring(0, atIndex),
    ref: source.substring(atIndex + 1)
  };
}

/**
 * Converts a string to PascalCase for class names
 * @param str - String to convert
 * @returns PascalCase version of the string
 * @example toPascalCase('my-plugin-name') // 'MyPluginName'
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts a string to camelCase for function names
 * @param str - String to convert
 * @returns camelCase version of the string
 * @example toCamelCase('my-plugin-name') // 'myPluginName'
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .map((word, index) => 
      index === 0 
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Formats TypeScript code using Prettier
 * @param code - The TypeScript code to format
 * @returns Formatted code
 */
async function formatCode(code: string): Promise<string> {
  try {
    return await format(code, {
      parser: 'typescript',
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    });
  } catch (error) {
    console.warn('Warning: Failed to format code with Prettier:', error);
    return code; // Return original code if formatting fails
  }
}

/**
 * Extracts unique actions from workflow files
 * @param workflowFiles - Array of workflow file entries
 * @returns Set of unique action org/repo references
 */
function extractActionsFromWorkflows(workflowFiles: FileEntry[]): Set<string> {
  const actions = new Set<string>();
  
  for (const file of workflowFiles) {
    try {
      const workflow = yaml.parse(file.content) as any;
      if (!workflow || !workflow.jobs) continue;
      
      // Extract actions from all jobs and steps
      for (const job of Object.values(workflow.jobs) as any[]) {
        if (!job.steps) continue;
        
        for (const step of job.steps) {
          if (step.uses) {
            // Extract org/repo from uses (e.g., "actions/checkout@v4" -> "actions/checkout")
            const usesMatch = step.uses.match(/^([^@]+)@/);
            if (usesMatch) {
              actions.add(usesMatch[1]);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not parse workflow ${file.relativePath} to extract actions:`, error);
    }
  }
  
  return actions;
}

/**
 * Automatically adds actions to the context config
 * @param context - The dotgithub context
 * @param actions - Set of action org/repo references to add
 * @param token - Optional GitHub token
 * @returns Array of successfully added actions
 */
async function autoAddActionsToConfig(context: DotGithubContext, actions: Set<string>, token?: string): Promise<string[]> {
  const addedActions: string[] = [];
  
  for (const orgRepo of actions) {
    try {
      console.log(`🔧 Auto-adding action: ${orgRepo}`);
      
      const result = await generateActionFiles(context, {
        orgRepoRef: orgRepo,
        token: token || process.env.GITHUB_TOKEN,
        useSha: true
      });
      
      addedActions.push(orgRepo);
      console.log(`✅ Added action: ${orgRepo}`);
    } catch (error) {
      console.warn(`⚠️  Failed to auto-add action ${orgRepo}:`, error instanceof Error ? error.message : error);
    }
  }
  
  return addedActions;
}

