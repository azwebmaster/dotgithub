import * as fs from 'fs';
import * as path from 'path';
import { getDefaultBranch, getRefSha, getLatestTag, getLatestTagSafe } from './github';
import { generateTypesFromActionYml } from './types-generator';
import { addActionToConfig, writeConfig } from './config';
import type { DotGithubAction } from './config';
import { formatWithPrettier, updateOrgIndexFile, updateRootIndexFile, updateIndexFilesAfterRemoval } from './file-utils';
import { toProperCase } from './utils';
import type { DotGithubContext } from './context';

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
 * Generates a GitHub Action TypeScript file from a GitHub repo and saves it to the output directory.
 * Creates an organization folder structure and updates index files.
 * Tracks the action in the dotgithub.json config file.
 * When no version is specified, defaults to the latest semver tag.
 * @param options - Configuration for file generation
 */
export async function generateActionFiles(context: DotGithubContext, options: GenerateActionFilesOptions): Promise<GenerateActionFilesResult> {
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

  // Check if this action already exists in config (only one per org/repo allowed)
  const existingAction = context.config.actions.find(action => action.orgRepo === orgRepo);
  if (existingAction) {
    // Remove the existing action's files before adding the new one
    try {
      const existingPath = context.resolvePath(existingAction.outputPath);
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
  
  const rootActionDir = context.resolvePath('actions');
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
  
  // Update or create index.ts file in the actions directory
  await updateRootIndexFile(rootActionDir, owner);

  // Generate function name (camelCase version of action name)
  const actionName = result.yaml.name.replace(/[^a-zA-Z0-9]/g, ' ');
  const ActionName = toProperCase(actionName.replace(/\s+/g, ' '));
  const functionName = ActionName.charAt(0).toLowerCase() + ActionName.slice(1);

  // Track this action in the config file
  const relativePath = path.relative(rootActionDir, filePath);
  addActionToConfig({
    orgRepo,
    ref: useSha ? finalRef : resolvedRef,  // Use SHA when useSha=true, versionRef when useSha=false
    versionRef: resolvedRef,
    functionName,
    outputPath: path.join('actions', relativePath)
  });

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
export async function removeActionFiles(context: DotGithubContext, options: RemoveActionFilesOptions): Promise<RemoveActionFilesResult> {
  const { orgRepo } = parseOrgRepoRef(options.orgRepoRef);
  const [owner, repo] = orgRepo.split('/');
  if (!owner || !repo) throw new Error('orgRepoRef must be in the form org/repo');

  let removedAction: DotGithubAction | undefined;
  let removedFiles: string[] = [];

  // Find the action in config (should only be one per org/repo)
  const actionIndex = context.config.actions.findIndex(action => action.orgRepo === orgRepo);
  
  if (actionIndex >= 0) {
    removedAction = context.config.actions[actionIndex];
    context.config.actions.splice(actionIndex, 1);
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
      const resolvedPath = context.resolvePath(removedAction.outputPath);
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
  writeConfig(context.config);

  return {
    removed: true,
    actionName: removedAction.functionName,
    removedFiles
  };
}

/**
 * Updates GitHub Actions to their latest versions or specified versions.
 * @param options - Configuration for update
 */
export async function updateActionFiles(context: DotGithubContext, options: UpdateActionFilesOptions): Promise<UpdateActionFilesResult> {
  const updated: UpdatedAction[] = [];
  const errors: UpdateError[] = [];
  
  // Determine which actions to update
  let actionsToUpdate = context.config.actions;
  let specificVersionRef: string | undefined;
  
  if (options.orgRepoRef) {
    const { orgRepo, ref } = parseOrgRepoRef(options.orgRepoRef);
    // Resolve @latest to actual tag name if needed
    const token = options.token || process.env.GITHUB_TOKEN;
    specificVersionRef = await resolveLatestRef(orgRepo, ref, token); // Store the specific version if provided
    actionsToUpdate = context.config.actions.filter(action => action.orgRepo === orgRepo);
    
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
      
      const result = await generateActionFiles(context, addOptions);
      
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
  const imports = `import { createStep } from '@dotgithub/core';\nimport type { GitHubStep, GitHubStepBase, GitHubActionInputValue } from '@dotgithub/core';\n\n`;
  return imports + generatedTypes;
}