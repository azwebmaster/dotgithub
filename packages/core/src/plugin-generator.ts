import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { cloneRepo } from './git';
import { getDefaultBranch } from './github';

export interface GeneratePluginFromGithubFilesOptions {
  pluginName: string;
  source: string; // Local path or GitHub repo (org/repo@ref format)
  outputDir: string;
  description?: string;
  overwrite?: boolean;
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
}

export interface CreatePluginFromFilesResult {
  pluginContent: string;
  filesFound: string[];
}

/**
 * Creates plugin content from .github files in a directory
 */
export function createPluginFromFiles(options: CreatePluginFromFilesOptions): CreatePluginFromFilesResult {
  const { pluginName, githubFilesPath, description = `Plugin generated from .github files` } = options;
  
  if (!fs.existsSync(githubFilesPath)) {
    throw new Error(`Path does not exist: ${githubFilesPath}`);
  }
  
  const stats = fs.statSync(githubFilesPath);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${githubFilesPath}`);
  }

  // Recursively collect all files from the .github directory
  const files = collectFilesRecursively(githubFilesPath);
  const filesFound = files.map(f => f.relativePath);

  if (files.length === 0) {
    throw new Error(`No files found in: ${githubFilesPath}`);
  }

  // Generate plugin content
  const pluginContent = generatePluginCode(pluginName, description, files);
  
  return {
    pluginContent,
    filesFound
  };
}

/**
 * Generates a plugin from .github files (local path or GitHub repo)
 */
export async function generatePluginFromGithubFiles(options: GeneratePluginFromGithubFilesOptions): Promise<GeneratePluginFromGithubFilesResult> {
  const { pluginName, source, outputDir, description, overwrite = false } = options;
  
  // Determine if source is a local path or GitHub repo
  let githubFilesPath: string;
  let tempDir: string | null = null;
  
  if (isGitHubRepo(source)) {
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
    githubFilesPath = path.join(tempDir, '.github');
    
    if (!fs.existsSync(githubFilesPath)) {
      throw new Error(`No .github directory found in ${orgRepo}${ref ? `@${ref}` : ''}`);
    }
  } else {
    // Use local path
    githubFilesPath = path.resolve(source);
    
    // If the source doesn't end with .github, append it
    if (!githubFilesPath.endsWith('.github')) {
      githubFilesPath = path.join(githubFilesPath, '.github');
    }
  }
  
  try {
    // Create plugin from files
    const result = createPluginFromFiles({
      pluginName,
      githubFilesPath,
      description
    });
    
    // Ensure output directory exists
    const outputPath = path.resolve(outputDir);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // Generate plugin file path
    const fileName = `${pluginName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()}-plugin.ts`;
    const pluginPath = path.join(outputPath, fileName);
    
    // Check if file exists and handle overwrite
    if (fs.existsSync(pluginPath) && !overwrite) {
      throw new Error(`Plugin file already exists: ${pluginPath}. Use --overwrite to replace it.`);
    }
    
    // Write plugin file
    fs.writeFileSync(pluginPath, result.pluginContent, 'utf8');
    
    return {
      pluginPath,
      pluginName,
      filesFound: result.filesFound,
      generatedContent: result.pluginContent
    };
    
  } finally {
    // Clean up temp directory if we created one
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// Helper functions

interface FileEntry {
  relativePath: string;
  fullPath: string;
  content: string;
}

function collectFilesRecursively(dirPath: string, basePath = ''): FileEntry[] {
  const files: FileEntry[] = [];
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const relativePath = path.join(basePath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Recursively collect files from subdirectories
      files.push(...collectFilesRecursively(itemPath, relativePath));
    } else {
      // Read file content
      const content = fs.readFileSync(itemPath, 'utf8');
      files.push({
        relativePath,
        fullPath: itemPath,
        content
      });
    }
  }
  
  return files;
}

/**
 * Converts a JavaScript value to a properly formatted code string
 */
function valueToCodeString(value: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(item => `${spaces}  ${valueToCodeString(item, indent + 1)}`);
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    
    const entries = keys.map(key => {
      const keyString = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      return `${spaces}  ${keyString}: ${valueToCodeString(value[key], indent + 1)}`;
    });
    
    return `{\n${entries.join(',\n')}\n${spaces}}`;
  }
  
  return 'undefined';
}

function generatePluginCode(pluginName: string, description: string, files: FileEntry[]): string {
  const className = toPascalCase(pluginName) + 'Plugin';
  const escapedDescription = description.replace(/'/g, "\\'");
  
  // Separate workflow files from other files
  const workflowFiles = files.filter(file => 
    file.relativePath.startsWith('workflows/') && 
    (file.relativePath.endsWith('.yml') || file.relativePath.endsWith('.yaml'))
  );
  const otherFiles = files.filter(file => 
    !(file.relativePath.startsWith('workflows/') && 
      (file.relativePath.endsWith('.yml') || file.relativePath.endsWith('.yaml')))
  );
  
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
  
  // Parse and generate workflow definitions
  const workflowDefinitions = workflowFiles.map(file => {
    const workflowName = path.basename(file.relativePath, path.extname(file.relativePath));
    try {
      const parsedWorkflow = yaml.load(file.content) as any;
      const workflowCode = valueToCodeString(parsedWorkflow, 2);
      return `    '${workflowName}': ${workflowCode}`;
    } catch (error) {
      console.warn(`Warning: Could not parse YAML in ${file.relativePath}, falling back to string:`, error);
      const escapedContent = JSON.stringify(file.content);
      return `    '${workflowName}': ${escapedContent}`;
    }
  }).join(',\n');
  
  const hasWorkflows = workflowFiles.length > 0;
  const hasOtherFiles = otherFiles.length > 0;
  
  let imports = `import type { DotGitHubPlugin, PluginContext } from '@dotgithub/core';`;
  
  // Add GitHubWorkflows import if we have workflows
  if (hasWorkflows) {
    imports += `\nimport type { GitHubWorkflows } from '@dotgithub/core';`;
  }
  
  let applyWorkflowsMethod = '';
  let applyResourcesMethod = '';
  let applyMethod = '';
  
  // Generate applyWorkflows method
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
  
  // Generate applyResources method
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
  
  // Generate main apply method that calls the other two
  applyMethod = `  async apply(context: PluginContext): Promise<void> {
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

function isGitHubRepo(source: string): boolean {
  // Simple check: contains slash and doesn't start with . or /
  return source.includes('/') && !source.startsWith('.') && !source.startsWith('/');
}

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

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

