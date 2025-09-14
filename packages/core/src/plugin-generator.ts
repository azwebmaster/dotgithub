import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { cloneRepo } from './git';
import { getDefaultBranch } from './github';
import type { DotGithubContext } from './context';

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
}

interface ActionImport {
  functionName: string;
  outputPath: string;
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

export interface GeneratePluginFromGithubFilesOptions {
  pluginName: string;
  source: string; // Local path, GitHub repo (org/repo@ref format), or GitHub URL to file
  description?: string;
  overwrite?: boolean;
  context: DotGithubContext; // Required context for config access and output directory resolution
}

export interface GeneratePluginFromGithubFilesResult {
  pluginPath: string;
  pluginName: string;
  filesFound: string[];
  generatedContent: string;
}

export interface CreatePluginFromFilesOptions {
  pluginName: string;
  githubFilesPath: string;
  description?: string;
  outputDir?: string;
  context: DotGithubContext; // Required context for config access
}

export interface CreatePluginFromFilesResult {
  pluginContent: string;
  filesFound: string[];
}

/**
 * Creates plugin content from .github files in a directory
 * @throws {Error} When path validation or file processing fails
 */
export function createPluginFromFiles(options: CreatePluginFromFilesOptions): CreatePluginFromFilesResult {
  const { pluginName, githubFilesPath, description = `Plugin generated from .github files`, outputDir, context } = options;
  
  // Validate plugin name
  if (!pluginName || pluginName.trim().length === 0) {
    throw new Error('Plugin name is required and cannot be empty');
  }
  
  // Validate path exists and is accessible
  if (!githubFilesPath || githubFilesPath.trim().length === 0) {
    throw new Error('Github files path is required and cannot be empty');
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

  // Generate plugin content
  let pluginContent: string;
  try {
    pluginContent = generatePluginCode(pluginName, description, files, outputDir, context.config);
  } catch (error) {
    throw new Error(`Failed to generate plugin code: ${error instanceof Error ? error.message : error}`);
  }
  
  return {
    pluginContent,
    filesFound
  };
}

/**
 * Generates a plugin from .github files (local path or GitHub repo)
 */
export async function generatePluginFromGithubFiles(options: GeneratePluginFromGithubFilesOptions): Promise<GeneratePluginFromGithubFilesResult> {
  const { pluginName, source, description, overwrite = false, context } = options;
  
  // Use context to resolve path relative to configured output directory
  const finalOutputDir = context.resolvePath('plugins');
  
  // Determine if source is a local path, GitHub repo, or GitHub file URL
  let result: CreatePluginFromFilesResult;
  let tempDir: string | null = null;
  
  if (isGitHubFileUrl(source)) {
    // Handle GitHub file URL
    const { content, filename } = await downloadGitHubFile(source);
    result = createPluginFromSingleFile(pluginName, filename, content, description, finalOutputDir, context.config);
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
    result = createPluginFromFiles({
      pluginName,
      githubFilesPath,
      description,
      outputDir: finalOutputDir,
      context
    });
  } else {
    // Use local path
    let githubFilesPath = path.resolve(source);
    
    // If the source doesn't end with .github, append it
    if (!githubFilesPath.endsWith('.github')) {
      githubFilesPath = path.join(githubFilesPath, '.github');
    }
    
    // Create plugin from files
    result = createPluginFromFiles({
      pluginName,
      githubFilesPath,
      description,
      outputDir: finalOutputDir,
      context
    });
  }
  
  try {
    // Use the finalOutputDir that was already calculated
    const outputPath = path.resolve(finalOutputDir);
    try {
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create output directory ${outputPath}: ${error instanceof Error ? error.message : error}`);
    }
    
    // Generate plugin file path with normalized separators
    const fileName = `${pluginName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()}-plugin.ts`;
    const pluginPath = path.resolve(outputPath, fileName);
    
    // Check if file exists and handle overwrite
    if (fs.existsSync(pluginPath) && !overwrite) {
      throw new Error(`Plugin file already exists: ${pluginPath}. Use --overwrite to replace it.`);
    }
    
    // Write plugin file with proper error handling
    try {
      fs.writeFileSync(pluginPath, result.pluginContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write plugin file ${pluginPath}: ${error instanceof Error ? error.message : error}`);
    }
    
    return {
      pluginPath,
      pluginName,
      filesFound: result.filesFound,
      generatedContent: result.pluginContent
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
function createPluginFromSingleFile(pluginName: string, filename: string, content: string, description?: string, outputDir?: string, config: Config | null = null): CreatePluginFromFilesResult {
  // Check if this is a workflow file (ends with .yaml or .yml)
  const isWorkflowFile = filename.endsWith('.yaml') || filename.endsWith('.yml');
  
  // If it's a workflow file, treat it as if it's in the workflows/ directory
  const relativePath = isWorkflowFile ? `workflows/${filename}` : filename;
  
  const fileEntry: FileEntry = {
    relativePath,
    fullPath: filename,
    content
  };
  
  const pluginContent = generatePluginCode(
    pluginName, 
    description || `Plugin generated from ${filename}`, 
    [fileEntry],
    outputDir,
    config
  );
  
  return {
    pluginContent,
    filesFound: [relativePath]
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
 * @returns Processed workflow schema with function calls
 */
function processWorkflowForGeneration(workflow: WorkflowSchema, config: Config | null, actionImports: Set<ActionImport>): WorkflowSchema {
  if (!config || !config.actions || !workflow.jobs) {
    return workflow;
  }

  const processedWorkflow: WorkflowSchema = { ...workflow };
  
  // Process each job in the workflow
  for (const [jobId, job] of Object.entries(processedWorkflow.jobs)) {
    if (!job.steps) continue;
    
    const processedSteps = job.steps.map((step: StepSchema | FunctionCallObject) => {
      return processStepForGeneration(step as StepSchema, config, actionImports);
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
 * @returns Either the original step or a function call object
 */
function processStepForGeneration(step: StepSchema, config: Config, actionImports: Set<ActionImport>): StepSchema | FunctionCallObject {
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

  // Add function name and output path to imports
  // Use the functionName as a key to avoid duplicates
  const existing = Array.from(actionImports).find(item => item.functionName === action.functionName);
  if (!existing) {
    actionImports.add({ functionName: action.functionName, outputPath: action.outputPath });
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
    __functionName: action.functionName,
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
 * Generates import statements for the plugin based on files and actions
 * @param hasWorkflows - Whether the plugin has workflow files
 * @param actionImports - Set of action function names to import
 * @param outputDir - Directory where the plugin will be output
 * @returns Import statements as a string
 */
function generateImports(hasWorkflows: boolean, actionImports: Set<ActionImport>, outputDir?: string): string {
  let imports = `import type { DotGitHubPlugin, PluginContext } from '@dotgithub/core';`;
  
  // Add GitHubWorkflows import if we have workflows
  if (hasWorkflows) {
    imports += `\nimport type { GitHubWorkflows, GitHubWorkflow } from '@dotgithub/core';`;
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
      
      imports += `\nimport { ${actionImport.functionName} } from '${importPath}';`;
    }
  }
  
  return imports;
}

/**
 * Generates workflow-related methods for the plugin class
 * @param workflowFiles - Array of workflow files to process
 * @param config - Configuration object for action replacement
 * @param actionImports - Set to collect action function names for imports
 * @returns Object containing workflow definitions and applyWorkflows method
 */
function generateWorkflowMethods(
  workflowFiles: FileEntry[], 
  config: Config | null, 
  actionImports: Set<ActionImport>
): { workflowDefinitions: string; applyWorkflowsMethod: string } {
  const hasWorkflows = workflowFiles.length > 0;
  
  // Parse and generate workflow definitions, replacing 'uses' with action functions
  const workflowDefinitions = workflowFiles.map(file => {
    const workflowName = path.basename(file.relativePath, path.extname(file.relativePath));
    try {
      const parsedWorkflow = yaml.load(file.content) as any;
      
      // Process workflow to replace 'uses' with action functions during generation time
      const processedWorkflow = processWorkflowForGeneration(parsedWorkflow, config, actionImports);
      
      const workflowCode = valueToCodeString(processedWorkflow, 2);
      return `    '${workflowName}': ${workflowCode}`;
    } catch (error) {
      console.warn(`Warning: Could not parse YAML in ${file.relativePath}, falling back to string:`, error);
      const escapedContent = JSON.stringify(file.content);
      return `    '${workflowName}': ${escapedContent}`;
    }
  }).join(',\n');
  
  // Generate applyWorkflows method
  let applyWorkflowsMethod: string;
  if (hasWorkflows) {
    applyWorkflowsMethod = `  async applyWorkflows(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    ${workflowFiles.map(file => {
      const workflowName = path.basename(file.relativePath, path.extname(file.relativePath));
      return `stack.addWorkflow('${workflowName}', this.workflows['${workflowName}']);`;
    }).join('\n    ')}
  }`;
  } else {
    applyWorkflowsMethod = `  async applyWorkflows(_context: PluginContext): Promise<void> {
    // This plugin doesn't define any workflows
  }`;
  }
  
  return { workflowDefinitions, applyWorkflowsMethod };
}

/**
 * Generates resource-related methods for the plugin class
 * @param otherFiles - Array of non-workflow files to process
 * @returns Object containing files object and applyResources method
 */
function generateResourceMethods(otherFiles: FileEntry[]): { filesObject: string; applyResourcesMethod: string } {
  const hasOtherFiles = otherFiles.length > 0;
  
  // Generate files object for non-workflow files, parsing YAML when possible
  const filesObject = otherFiles.map(file => {
    const escapedPath = file.relativePath.replace(/\\/g, '/');
    
    // Try to parse YAML files for better code generation
    if (file.relativePath.endsWith('.yml') || file.relativePath.endsWith('.yaml')) {
      try {
        const parsedYaml = yaml.load(file.content) as any;
        const yamlCode = valueToCodeString(parsedYaml, 2);
        return `    '${escapedPath}': ${yamlCode}`;
      } catch (error) {
        console.warn(`Warning: Could not parse YAML in ${file.relativePath}, using as string:`, error);
      }
    }
    
    // Fallback to string content
    const escapedContent = JSON.stringify(file.content);
    return `    '${escapedPath}': ${escapedContent}`;
  }).join(',\n');
  
  // Generate applyResources method
  let applyResourcesMethod: string;
  if (hasOtherFiles) {
    applyResourcesMethod = `  async applyResources(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    ${otherFiles.map(file => {
      const escapedPath = file.relativePath.replace(/\\/g, '/');
      const isYaml = file.relativePath.endsWith('.yml') || file.relativePath.endsWith('.yaml');
      
      if (isYaml) {
        // For YAML files, use addResource to allow object content
        return `stack.addResource('${escapedPath}', { content: this.files['${escapedPath}'] });`;
      } else {
        // For non-YAML files, use addFileResource for string content
        return `stack.addFileResource('${escapedPath}', this.files['${escapedPath}']);`;
      }
    }).join('\n    ')}
  }`;
  } else {
    applyResourcesMethod = `  async applyResources(_context: PluginContext): Promise<void> {
    // This plugin doesn't define any resources
  }`;
  }
  
  return { filesObject, applyResourcesMethod };
}

/**
 * Generates the main class definition for the plugin
 * @param pluginName - Name of the plugin
 * @param description - Description of the plugin
 * @param files - Array of all files included in the plugin
 * @param className - PascalCase class name
 * @param imports - Import statements string
 * @param hasWorkflows - Whether plugin has workflows
 * @param hasOtherFiles - Whether plugin has non-workflow files
 * @param workflowDefinitions - Workflow definitions code
 * @param filesObject - Files object code
 * @param applyWorkflowsMethod - Apply workflows method code
 * @param applyResourcesMethod - Apply resources method code
 * @returns Complete class definition as string
 */
function generateClassDefinition(
  pluginName: string,
  description: string,
  files: FileEntry[],
  className: string,
  imports: string,
  hasWorkflows: boolean,
  hasOtherFiles: boolean,
  workflowDefinitions: string,
  filesObject: string,
  applyWorkflowsMethod: string,
  applyResourcesMethod: string
): string {
  const escapedDescription = description.replace(/'/g, "\\'");
  
  // Generate main apply method that calls the other two
  const applyMethod = `  async apply(context: PluginContext): Promise<void> {
    await this.applyWorkflows(context);
    await this.applyResources(context);
  }`;
  
  return `${imports}

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
${hasWorkflows ? `
  private readonly workflows: GitHubWorkflows = {
${workflowDefinitions}
  };` : ''}
${hasOtherFiles ? `
  private readonly files: Record<string, any> = {
${filesObject}
  };` : ''}

${applyWorkflowsMethod}

${applyResourcesMethod}

${applyMethod}
}

// Export as default for easier importing
export default new ${className}();
`;
}

/**
 * Generates plugin code from a set of .github files
 * @param pluginName - Name of the plugin to generate
 * @param description - Description of the plugin
 * @param files - Array of file entries containing .github files
 * @param outputDir - Optional output directory for import path calculation
 * @param config - Optional config for action replacement, or null to skip replacement
 * @returns Generated TypeScript plugin code
 */
function generatePluginCode(pluginName: string, description: string, files: FileEntry[], outputDir?: string, config: Config | null = null): string {
  const className = toPascalCase(pluginName) + 'Plugin';
  
  // Separate workflow files from other files
  const { workflowFiles, otherFiles } = separateWorkflowFromOtherFiles(files);
  
  // Use the provided config for available actions for uses replacement
  const actionImports: Set<ActionImport> = new Set();

  // Generate workflow methods and definitions
  const { workflowDefinitions, applyWorkflowsMethod } = generateWorkflowMethods(workflowFiles, config, actionImports);
  
  // Generate resource methods and definitions
  const { filesObject, applyResourcesMethod } = generateResourceMethods(otherFiles);
  
  // Generate imports
  const hasWorkflows = workflowFiles.length > 0;
  const hasOtherFiles = otherFiles.length > 0;
  const imports = generateImports(hasWorkflows, actionImports, outputDir);
  
  // Generate complete class definition
  return generateClassDefinition(
    pluginName,
    description,
    files,
    className,
    imports,
    hasWorkflows,
    hasOtherFiles,
    workflowDefinitions,
    filesObject,
    applyWorkflowsMethod,
    applyResourcesMethod
  );
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

