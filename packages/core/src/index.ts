import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDefaultBranch, getRefSha, getLatestTag, getLatestTagSafe } from './github';
import { cloneRepo } from './git';
import { readActionYml } from './action-yml';
import { generateTypesFromYml } from './typegen';
import * as prettier from 'prettier';
import { addActionToConfig, readConfig, writeConfig, getResolvedOutputPath, getConfigPath } from './config';
import type { DotGithubAction } from './config';

export function helloCore(): string {
  return 'Hello from @dotgithub/core!';
}

// Export types and functions that will be used by generated code
export { createStep } from './actions';
export type { GitHubStep, GitHubStepBase, GitHubWorkflow, GitHubJob } from './types/workflow';

// Export construct classes for CDK-style workflow building
export * from './constructs';

// Export GH class and types
export { GH } from './GH';
export type { DotGitHubResource, DotGitHub } from './types/common';

// Export workflow generation functions
export { generateWorkflowYaml, createWorkflow, createJob } from './workflow-generator';
export type { WorkflowGenerationOptions } from './workflow-generator';

// Export template system
export { TemplateLoader, createTemplateLoader } from './template';
export type { TemplateConfig, TemplateVariable, TemplateContext, ProcessedTemplate } from './template';

// Export template validation
export { validateTemplate, createTemplateValidator, TemplateValidator } from './template-validator';
export type { ValidationResult, ValidationError, ValidationWarning, ValidationOptions } from './template-validator';

// Export GitHub files generation
export {
  generateGithubFiles,
  generateDependabotConfig,
  generateCodeowners,
  generateIssueTemplate,
  generatePullRequestTemplate,
  generateFundingConfig,
  generateSecurityPolicy,
  GitHubFilesGenerators
} from './github-files-generator';
export type {
  GenerateGithubFilesOptions,
  GenerateGithubFilesResult,
  DependabotConfig,
  DependabotUpdate,
  CodeownersEntry,
  IssueTemplate,
  PullRequestTemplate,
  FundingConfig,
  SecurityPolicy,
  SupportedGitHubFile
} from './github-files-generator';

// Export configuration functionality
export {
  readConfig,
  writeConfig,
  addActionToConfig,
  removeActionFromConfig,
  getActionsFromConfig,
  getActionsFromConfigWithResolvedPaths,
  getResolvedOutputPath,
  updateOutputDir,
  getConfigPath,
  setConfigPath,
  createDefaultConfig,
  getPluginsFromConfig,
  getStacksFromConfig,
  addPluginToConfig,
  removePluginFromConfig,
  addStackToConfig,
  removeStackFromConfig
} from './config';
export type {
  DotGithubConfig,
  DotGithubAction
} from './config';

// Export plugin system
export * from './plugins';
export { StackSynthesizer } from './stack-synthesizer';
export type { StackSynthesizerOptions, SynthesisResult, SynthesisResults } from './stack-synthesizer';

export interface GenerateTypesResult {
  yaml: any;
  type: string;
}

export interface GenerateActionFilesOptions {
  orgRepoRef: string;
  outputDir?: string;
  token?: string;
  useSha?: boolean;
}

export interface GenerateActionFilesResult {
  filePath: string;
  actionName: string;
  generatedTypes: string;
}

export interface RemoveActionFilesOptions {
  orgRepoRef: string;
  keepFiles?: boolean;
}

export interface RemoveActionFilesResult {
  removed: boolean;
  actionName: string;
  removedFiles: string[];
}

export interface UpdateActionFilesOptions {
  orgRepoRef?: string; // If not provided, update all actions
  outputDir?: string;
  token?: string;
  useLatest?: boolean; // Use latest git tag instead of versionRef
  useSha?: boolean;
}

export interface UpdateActionFilesResult {
  updated: UpdatedAction[];
  errors: UpdateError[];
}

export interface UpdatedAction {
  orgRepo: string;
  previousVersion: string;
  newVersion: string;
  filePath: string;
}

export interface UpdateError {
  orgRepo: string;
  error: string;
}

/**
 * Clones a GitHub repo, checks out a ref, reads action.yml, and generates a TypeScript type.
 * @param orgRepo e.g. 'actions/checkout'
 * @param ref tag/sha/branch (optional, defaults to default branch)
 * @param token GitHub token (optional, overrides env GITHUB_TOKEN)
 * @param versionRef user-friendly version reference to use in generated code
 */
export async function generateTypesFromActionYml(orgRepo: string, ref?: string, token?: string, versionRef?: string): Promise<GenerateTypesResult> {
  const [owner, repo] = orgRepo.split('/');
  if (!owner || !repo) throw new Error('orgRepo must be in the form org/repo');
  token = token || process.env.GITHUB_TOKEN;

  // Use versionRef for cloning if provided, otherwise use ref
  let cloneRefToUse = versionRef || ref;
  if (!cloneRefToUse) {
    const defaultBranch = await getDefaultBranch(owner, repo, token);
    cloneRefToUse = defaultBranch;
    if (!ref) ref = defaultBranch;
  }
  
  if (!ref) {
    ref = cloneRefToUse;
  }

  const tmpDir = createTempDir();
  await cloneRepoToTemp(owner, repo, cloneRefToUse, token, tmpDir);
  const yml = readActionYml(tmpDir);
  const type = generateTypesFromYml(yml, orgRepo, ref, versionRef);
  cleanupTempDir(tmpDir);
  return { yaml: yml, type };
}

/**
 * Generates a GitHub Action TypeScript file from a GitHub repo and saves it to the output directory.
 * Creates an organization folder structure and updates index files.
 * Tracks the action in the dotgithub.json config file.
 * When no version is specified, defaults to the latest semver tag.
 * @param options - Configuration for file generation
 */
export async function generateActionFiles(options: GenerateActionFilesOptions): Promise<GenerateActionFilesResult> {
  const { orgRepo, ref } = parseOrgRepoRef(options.orgRepoRef);
  const [owner, repo] = orgRepo.split('/');
  if (!owner || !repo) throw new Error('orgRepo must be in the form org/repo');

  const token = options.token || process.env.GITHUB_TOKEN;
  
  // If no ref provided, default to latest tag; if @latest specified, resolve it
  let resolvedRef: string;
  if (!ref) {
    // No version specified, use latest tag as default
    try {
      resolvedRef = await getLatestTag(owner, repo, token);
    } catch (error) {
      // Fallback to default branch if no tags available
      console.warn(`No tags found for ${orgRepo}, falling back to default branch`);
      resolvedRef = await getDefaultBranch(owner, repo, token);
    }
  } else {
    // Resolve @latest to actual tag name, or use provided ref
    const resolvedLatestRef = await resolveLatestRef(orgRepo, ref, token);
    resolvedRef = resolvedLatestRef || ref;
  }

  // Resolve to SHA by default unless useSha is explicitly false
  const useSha = options.useSha !== false;
  const finalRef = useSha ? await getRefSha(owner, repo, resolvedRef, token) : resolvedRef;

  // Use output directory from config if not specified
  const configPath = path.dirname(getConfigPath());
  const config = readConfig();
  const outputDir = options.outputDir ? path.resolve(options.outputDir) : path.resolve(configPath, config.outputDir);

  // Check if this action already exists in config (only one per org/repo allowed)
  const existingAction = config.actions.find(action => action.orgRepo === orgRepo);
  if (existingAction) {
    // Remove the existing action's files before adding the new one
    try {
      const existingPath = getResolvedOutputPath(existingAction);
      if (fs.existsSync(existingPath)) {
        fs.unlinkSync(existingPath);
      }
    } catch (error) {
      console.warn(`Warning: Could not remove existing action files: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Generate the TypeScript types
  // When useSha is false, both createStep and comments should use resolvedRef
  const refForCreateStep = useSha ? finalRef : resolvedRef;
  const refForComments = resolvedRef;
  const result = await generateTypesFromActionYml(orgRepo, refForCreateStep, token, refForComments);
  
  // Generate filename from action name
  const actionNameForFile = generateFilenameFromActionName(result.yaml.name);
  const fileName = `${actionNameForFile}.ts`;
  
  const rootActionDir = path.join(outputDir, 'actions');
  const actionDir = path.join(rootActionDir, owner);
  const filePath = path.join(actionDir, fileName);

  // Ensure action directory exists
  fs.mkdirSync(actionDir, { recursive: true });

  // Add import statement to the generated types
  const typesWithImports = addImportsToGeneratedTypes(result.type);
  
  // Format the code with prettier
  const formattedCode = await formatWithPrettier(typesWithImports);
  
  console.log(`Writing generated types for ${orgRepo}@${finalRef} to ${filePath}`);
  // Write the TypeScript file
  fs.writeFileSync(filePath, formattedCode, 'utf8');

  // Update or create index.ts file in the org folder
  await updateOrgIndexFile(actionDir, actionNameForFile);
  
  // Update or create index.ts file in the root output directory
  await updateRootIndexFile(rootActionDir, owner);

  // Track this action in the config file
  addActionToConfig({
    orgRepo,
    ref: useSha ? finalRef : resolvedRef,  // Use SHA when useSha=true, versionRef when useSha=false
    versionRef: resolvedRef,
    displayName: result.yaml.name,
    outputPath: filePath
  }, outputDir);

  return {
    filePath,
    actionName: actionNameForFile,
    generatedTypes: typesWithImports
  };
}

/**
 * Removes a GitHub Action from tracking and optionally deletes generated files.
 * @param options - Configuration for removal
 */
export async function removeActionFiles(options: RemoveActionFilesOptions): Promise<RemoveActionFilesResult> {
  const { orgRepo } = parseOrgRepoRef(options.orgRepoRef);
  const [owner, repo] = orgRepo.split('/');
  if (!owner || !repo) throw new Error('orgRepoRef must be in the form org/repo');

  const config = readConfig();
  let removedAction: DotGithubAction | undefined;
  let removedFiles: string[] = [];

  // Find the action in config (should only be one per org/repo)
  const actionIndex = config.actions.findIndex(action => action.orgRepo === orgRepo);
  
  if (actionIndex >= 0) {
    removedAction = config.actions[actionIndex];
    config.actions.splice(actionIndex, 1);
  }

  if (!removedAction) {
    return {
      removed: false,
      actionName: orgRepo,
      removedFiles: []
    };
  }

  // Remove files if not keeping them
  if (!options.keepFiles) {
    try {
      const resolvedPath = getResolvedOutputPath(removedAction);
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
        removedFiles.push(resolvedPath);
      }

      // Update index files
      const orgDir = path.dirname(resolvedPath); // org directory  
      const outputDir = path.dirname(orgDir); // root directory
      await updateIndexFilesAfterRemoval(outputDir, path.basename(orgDir));
    } catch (error) {
      console.warn(`Warning: Could not remove some files: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Save updated config
  writeConfig(config);

  return {
    removed: true,
    actionName: removedAction.displayName,
    removedFiles
  };
}

/**
 * Updates GitHub Actions to their latest versions or specified versions.
 * @param options - Configuration for update
 */
export async function updateActionFiles(options: UpdateActionFilesOptions): Promise<UpdateActionFilesResult> {
  const config = readConfig();
  const updated: UpdatedAction[] = [];
  const errors: UpdateError[] = [];
  
  // Determine which actions to update
  let actionsToUpdate = config.actions;
  let specificVersionRef: string | undefined;
  
  if (options.orgRepoRef) {
    const { orgRepo, ref } = parseOrgRepoRef(options.orgRepoRef);
    // Resolve @latest to actual tag name if needed
    const token = options.token || process.env.GITHUB_TOKEN;
    specificVersionRef = await resolveLatestRef(orgRepo, ref, token); // Store the specific version if provided
    actionsToUpdate = config.actions.filter(action => action.orgRepo === orgRepo);
    
    if (actionsToUpdate.length === 0) {
      errors.push({
        orgRepo,
        error: `Action ${orgRepo} not found in config`
      });
      return { updated, errors };
    }
  }

  for (const action of actionsToUpdate) {
    try {
      const [owner, repo] = action.orgRepo.split('/');
      const token = options.token || process.env.GITHUB_TOKEN;
      
      let newVersionRef: string;
      if (options.useLatest) {
        // Get the latest tag using semver
        newVersionRef = await (getLatestTagSafe as any)(owner, repo, token);
      } else if (specificVersionRef) {
        // Use the specific version provided in the command
        newVersionRef = specificVersionRef;
      } else {
        // Use the existing versionRef (for updating all actions without specifying versions)
        newVersionRef = action.versionRef;
      }
      
      // Check if this is actually an update
      if (newVersionRef === action.versionRef && !options.useLatest) {
        continue; // Skip if no update needed
      }
      
      const previousVersion = action.versionRef;
      
      // Update the action using the add function (which handles replacement)
      const addOptions: GenerateActionFilesOptions = {
        orgRepoRef: `${action.orgRepo}@${newVersionRef}`,
        outputDir: options.outputDir,
        token: token,
        useSha: options.useSha
      };
      
      const result = await generateActionFiles(addOptions);
      
      updated.push({
        orgRepo: action.orgRepo,
        previousVersion,
        newVersion: newVersionRef,
        filePath: result.filePath
      });
      
    } catch (error) {
      errors.push({
        orgRepo: action.orgRepo,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return { updated, errors };
}

// Private helpers
function createTempDir(): string {
  return fs.mkdtempSync(os.tmpdir() + '/action-yml-');
}

async function cloneRepoToTemp(owner: string, repo: string, ref: string | undefined, token: string | undefined, tmpDir: string) {
  const url = token
    ? `https://${token}:x-oauth-basic@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;
  const cloneOptions: Record<string, any> = { '--depth': 1 };
  if (ref) cloneOptions['--branch'] = ref;
  await cloneRepo(url, tmpDir, cloneOptions);
}

function cleanupTempDir(tmpDir: string) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Formats TypeScript code using prettier
 * @param code - TypeScript code to format
 * @returns Formatted TypeScript code
 */
async function formatWithPrettier(code: string): Promise<string> {
  try {
    return await prettier.format(code, {
      parser: 'typescript',
    });
  } catch (error) {
    console.warn('Failed to format code with prettier:', error);
    return code; // Return original code if formatting fails
  }
}

/**
 * Parses orgRepoRef format like "actions/checkout@v4", "actions/checkout@latest", or "actions/checkout"
 * @param orgRepoRef - String in format org/repo@ref or org/repo
 * @returns Object with orgRepo and ref
 */
function parseOrgRepoRef(orgRepoRef: string): { orgRepo: string; ref?: string } {
  const atIndex = orgRepoRef.lastIndexOf('@');
  if (atIndex === -1) {
    return { orgRepo: orgRepoRef };
  }
  return {
    orgRepo: orgRepoRef.substring(0, atIndex),
    ref: orgRepoRef.substring(atIndex + 1)
  };
}

/**
 * Resolves @latest references to the latest semver tag
 * @param orgRepo - Organization/repository string
 * @param ref - Reference that might be '@latest'
 * @param token - GitHub token
 * @returns Resolved reference (tag name for @latest, original ref otherwise)
 */
async function resolveLatestRef(orgRepo: string, ref: string | undefined, token?: string): Promise<string | undefined> {
  if (ref === 'latest') {
    const [owner, repo] = orgRepo.split('/');
    if (!owner || !repo) throw new Error('orgRepo must be in the form org/repo');
    return await getLatestTag(owner, repo, token);
  }
  return ref;
}

/**
 * Generates a filename from the action name by converting to kebab-case
 * @param actionName - The action name from action.yml
 * @returns Filename-safe string
 */
function generateFilenameFromActionName(actionName: string): string {
  if (!actionName) throw new Error('Action name is required');
  // Convert to kebab-case by replacing non-alphanumeric with hyphens and lowercase
  return actionName
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
}

/**
 * Adds necessary import statements to the generated TypeScript code
 * @param generatedTypes - The generated TypeScript code
 * @returns TypeScript code with import statements
 */
function addImportsToGeneratedTypes(generatedTypes: string): string {
  const imports = `import { createStep } from '@dotgithub/core';\nimport type { GitHubStep, GitHubStepBase } from '@dotgithub/core';\n\n`;
  return imports + generatedTypes;
}


/**
 * Updates or creates org index.ts file to export from action folders
 * @param orgDir - Organization directory path
 * @param actionName - Action name (folder name)
 */
async function updateOrgIndexFile(orgDir: string, actionName: string): Promise<void> {
  const indexPath = path.join(orgDir, 'index.ts');
  const exportStatement = `export * from './${actionName}.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates (check for the action reference regardless of quotes)
    const exportPattern = new RegExp(`export\\s*\\*\\s*from\\s*['"]\\./${actionName}\\.js['"]`);
    if (!exportPattern.test(existingContent)) {
      const newContent = existingContent + exportStatement;
      const formattedContent = await formatWithPrettier(newContent);
      fs.writeFileSync(indexPath, formattedContent, 'utf8');
    }
  } else {
    const formattedContent = await formatWithPrettier(exportStatement);
    fs.writeFileSync(indexPath, formattedContent, 'utf8');
  }
}

/**
 * Updates or creates root index.ts file to export from organization folders
 * @param outputDir - Root output directory path
 * @param orgName - Organization name (folder name)
 */
async function updateRootIndexFile(outputDir: string, orgName: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  const exportStatement = `export * as ${orgName} from './${orgName}/index.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates (check for the org reference regardless of quotes)
    const exportPattern = new RegExp(`export\\s*\\*\\s*as\\s*${orgName}\\s*from\\s*['"]\\./${orgName}/index\\.js['"]`);
    if (!exportPattern.test(existingContent)) {
      const newContent = existingContent + exportStatement;
      const formattedContent = await formatWithPrettier(newContent);
      fs.writeFileSync(indexPath, formattedContent, 'utf8');
    }
  } else {
    const formattedContent = await formatWithPrettier(exportStatement);
    fs.writeFileSync(indexPath, formattedContent, 'utf8');
  }
}


/**
 * Updates index files after removing an action
 * @param outputDir - Root output directory path
 * @param orgName - Organization name (folder name)
 */
async function updateIndexFilesAfterRemoval(outputDir: string, orgName: string): Promise<void> {
  const orgDir = path.join(outputDir, orgName);
  
  // Check if org directory still has any action files
  if (fs.existsSync(orgDir)) {
    const actionFiles = fs.readdirSync(orgDir).filter(item => {
      const itemPath = path.join(orgDir, item);
      return fs.statSync(itemPath).isFile() && item.endsWith('.ts') && item !== 'index.ts';
    });
    
    if (actionFiles.length === 0) {
      // No more action files, remove the org directory
      fs.rmSync(orgDir, { recursive: true, force: true });
      
      // Update root index.ts to remove this org export
      const rootIndexPath = path.join(outputDir, 'index.ts');
      if (fs.existsSync(rootIndexPath)) {
        const content = fs.readFileSync(rootIndexPath, 'utf8');
        const lines = content.split('\n');
        const filteredLines = lines.filter(line => 
          !line.includes(`export * as ${orgName} from`)
        );
        const newContent = filteredLines.join('\n');
        const formattedContent = await formatWithPrettier(newContent);
        fs.writeFileSync(rootIndexPath, formattedContent, 'utf8');
      }
    } else {
      // Still has action files, rebuild the org index.ts
      const orgIndexPath = path.join(orgDir, 'index.ts');
      const exportStatements = actionFiles.map(file => {
        const fileNameWithoutExt = path.basename(file, '.ts');
        return `export * from './${fileNameWithoutExt}.js';`;
      }).join('\n') + '\n';
      
      const formattedContent = await formatWithPrettier(exportStatements);
      fs.writeFileSync(orgIndexPath, formattedContent, 'utf8');
    }
  }
}
