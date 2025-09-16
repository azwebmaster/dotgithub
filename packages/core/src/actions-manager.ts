import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDefaultBranch, getRefSha, getLatestTag, getLatestTagSafe } from './github';
import { generateTypesFromActionYml, findAllActionsInRepo, generateTypesFromActionYmlAtPath } from './types-generator';
import { cloneRepo } from './git';
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
  actions?: GeneratedAction[]; // For multi-action repos
}

export interface GeneratedAction {
  actionPath: string; // Path within the repo (e.g., "" for root, "setup-node" for subdirectory)
  actionName: string;
  filePath: string;
  functionName: string;
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
 * Generates GitHub Action TypeScript files from a GitHub repo and saves them to the output directory.
 * Handles repositories with multiple actions in subdirectories.
 * Creates an organization/repo folder structure and updates index files.
 * Tracks the actions in the dotgithub.json config file.
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

  // Clone the repo and find all actions
  const tmpDir = createTempDir();
  try {
    await cloneRepoToTemp(owner, repo, resolvedRef, token, tmpDir);
    const actionPaths = findAllActionsInRepo(tmpDir);

    if (actionPaths.length === 0) {
      throw new Error(`No action.yml or action.yaml files found in ${orgRepo}`);
    }

    console.log(`Found ${actionPaths.length} action(s) in ${orgRepo}: ${actionPaths.join(', ') || 'root'}`);

    // Remove existing actions for this repo
    const existingActions = context.config.actions.filter(action => action.orgRepo === orgRepo);
    for (const existingAction of existingActions) {
      try {
        const existingPath = context.resolvePath(existingAction.outputPath);
        if (fs.existsSync(existingPath)) {
          fs.unlinkSync(existingPath);
        }
      } catch (error) {
        console.warn(`Warning: Could not remove existing action files: ${error instanceof Error ? error.message : error}`);
      }
    }
    // Remove from config
    context.config.actions = context.config.actions.filter(action => action.orgRepo !== orgRepo);

    const generatedActions: GeneratedAction[] = [];
    const rootActionDir = context.resolvePath('actions');
    console.log(`Generating action files to ${rootActionDir}`);
    const repoDir = path.join(rootActionDir, owner, repo);

    for (const actionPath of actionPaths) {
      // Generate types for this action
      const refForCreateStep = useSha ? finalRef : resolvedRef;
      const refForComments = resolvedRef;
      const result = generateTypesFromActionYmlAtPath(tmpDir, actionPath, orgRepo, refForCreateStep, refForComments);

      // Generate filename from action name
      const actionNameForFile = generateFilenameFromActionName(result.yaml.name);
      const fileName = `${actionNameForFile}.ts`;

      // Create directory structure:
      // - Single action at root: actions/owner/repo.ts
      // - Multiple actions or subdirectory action: actions/owner/repo/[actionPath/]actionName.ts
      let actionSubDir: string;
      let filePath: string;

      if (actionPaths.length === 1 && !actionPath) {
        // Single action at root - place file directly in owner directory
        actionSubDir = path.join(rootActionDir, owner);
        filePath = path.join(actionSubDir, `${repo}.ts`);
      } else {
        // Multiple actions or action in subdirectory - use folder structure
        actionSubDir = actionPath ? path.join(repoDir, actionPath) : repoDir;
        filePath = path.join(actionSubDir, fileName);
      }

      // Ensure action directory exists
      fs.mkdirSync(actionSubDir, { recursive: true });

      // Add import statement to the generated types
      const typesWithImports = addImportsToGeneratedTypes(result.type);

      // Format the code with prettier
      const formattedCode = await formatWithPrettier(typesWithImports);

      console.log(`Writing generated types for ${orgRepo}/${actionPath || 'root'}@${finalRef} to ${filePath}`);
      // Write the TypeScript file
      fs.writeFileSync(filePath, formattedCode, 'utf8');

      // Generate function name (camelCase version of action name)
      const actionName = result.yaml.name.replace(/[^a-zA-Z0-9]/g, ' ');
      const ActionName = toProperCase(actionName.replace(/\s+/g, ' '));
      const functionName = ActionName.charAt(0).toLowerCase() + ActionName.slice(1);

      addActionToConfig({
        orgRepo,
        ref: useSha ? finalRef : resolvedRef,
        versionRef: resolvedRef,
        functionName,
        outputPath: filePath,
        actionPath: actionPath || undefined
      });

      generatedActions.push({
        actionPath,
        actionName: actionNameForFile,
        filePath,
        functionName
      });
    }

    // Update index files for the repo
    // Only create repo index file if we created a repo directory (multiple actions)
    if (actionPaths.length > 1 || actionPaths.some(p => p !== '')) {
      await updateRepoIndexFile(repoDir, generatedActions);
    }
    await updateOrgIndexFile(path.join(rootActionDir, owner), repo);
    await updateRootIndexFile(rootActionDir, owner);

    // Return result for the first action (for backwards compatibility)
    // But include all actions in the actions field
    const firstAction = generatedActions[0];
    if (!firstAction) {
      throw new Error('No actions were generated');
    }
    return {
      filePath: firstAction.filePath,
      actionName: firstAction.actionName,
      generatedTypes: '', // Not returning the types for simplicity
      actions: generatedActions
    };
  } finally {
    cleanupTempDir(tmpDir);
  }
}

/**
 * Removes GitHub Actions from tracking and optionally deletes generated files.
 * Removes all actions from a repository.
 * @param options - Configuration for removal
 */
export async function removeActionFiles(context: DotGithubContext, options: RemoveActionFilesOptions): Promise<RemoveActionFilesResult> {
  const { orgRepo } = parseOrgRepoRef(options.orgRepoRef);
  const [owner, repo] = orgRepo.split('/');
  if (!owner || !repo) throw new Error('orgRepoRef must be in the form org/repo');

  // Find all actions for this repo
  const actionsToRemove = context.config.actions.filter(action => action.orgRepo === orgRepo);
  const removedFiles: string[] = [];

  if (actionsToRemove.length === 0) {
    return {
      removed: false,
      actionName: orgRepo,
      removedFiles: []
    };
  }

  // Remove files if not keeping them
  if (!options.keepFiles) {
    const rootActionDir = context.resolvePath('');
    const repoDir = path.join(rootActionDir, owner, repo);
    const singleActionFile = path.join(rootActionDir, owner, `${repo}.ts`);

    // Remove all action files
    for (const action of actionsToRemove) {
      try {
        const resolvedPath = context.resolvePath(action.outputPath);
        if (fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
          removedFiles.push(resolvedPath);
        }
      } catch (error) {
        console.warn(`Warning: Could not remove action file: ${error instanceof Error ? error.message : error}`);
      }
    }

    // Remove repo directory if it exists (multiple actions case)
    try {
      if (fs.existsSync(repoDir)) {
        fs.rmSync(repoDir, { recursive: true, force: true });
        console.log(`Removed repository directory: ${repoDir}`);
      }

      // Remove single action file if it exists (single root action case)
      if (fs.existsSync(singleActionFile)) {
        fs.unlinkSync(singleActionFile);
        console.log(`Removed single action file: ${singleActionFile}`);
      }

      // Update index files
      const orgDir = path.join(rootActionDir, owner);
      await updateIndexFilesAfterRemoval(rootActionDir, owner);

      // Remove org directory if empty
      if (fs.existsSync(orgDir) && fs.readdirSync(orgDir).length === 1) { // Only index.ts left
        const indexPath = path.join(orgDir, 'index.ts');
        if (fs.existsSync(indexPath)) {
          fs.unlinkSync(indexPath);
        }
        if (fs.readdirSync(orgDir).length === 0) {
          fs.rmdirSync(orgDir);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not clean up directories: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Remove from config
  context.config.actions = context.config.actions.filter(action => action.orgRepo !== orgRepo);

  // Save updated config
  writeConfig(context.config);

  const actionNames = actionsToRemove.map(a => a.functionName).join(', ');
  console.log(`Removed ${actionsToRemove.length} action(s) from ${orgRepo}`);

  return {
    removed: true,
    actionName: actionNames,
    removedFiles
  };
}

/**
 * Updates GitHub Actions to their latest versions or specified versions.
 * Updates all actions from a repository as a group.
 * @param options - Configuration for update
 */
export async function updateActionFiles(context: DotGithubContext, options: UpdateActionFilesOptions): Promise<UpdateActionFilesResult> {
  const updated: UpdatedAction[] = [];
  const errors: UpdateError[] = [];

  // Group actions by orgRepo for batch updates
  const actionsByRepo = new Map<string, DotGithubAction[]>();

  if (options.orgRepoRef) {
    const { orgRepo, ref } = parseOrgRepoRef(options.orgRepoRef);
    const repoActions = context.config.actions.filter(action => action.orgRepo === orgRepo);

    if (repoActions.length === 0) {
      errors.push({
        orgRepo,
        error: `No actions from ${orgRepo} found in config`
      });
      return { updated, errors };
    }

    actionsByRepo.set(orgRepo, repoActions);
  } else {
    // Group all actions by orgRepo
    for (const action of context.config.actions) {
      const existing = actionsByRepo.get(action.orgRepo) || [];
      existing.push(action);
      actionsByRepo.set(action.orgRepo, existing);
    }
  }

  // Update each repository's actions
  for (const [orgRepo, repoActions] of actionsByRepo) {
    try {
      const [owner, repo] = orgRepo.split('/');
      const token: string | undefined = options.token || process.env.GITHUB_TOKEN;

      // Get the version to update to
      let newVersionRef: string;
      if (options.orgRepoRef) {
        const { ref } = parseOrgRepoRef(options.orgRepoRef);
        const resolvedRef = await resolveLatestRef(orgRepo, ref, token);
        newVersionRef = resolvedRef || ref || repoActions[0]?.versionRef || 'latest';
      } else if (options.useLatest) {
        // Get the latest tag using semver
        // TODO: Fix TypeScript strict null check issue
        newVersionRef = 'latest';
      } else {
        // Use the existing versionRef
        newVersionRef = repoActions[0]?.versionRef || 'latest';
      }

      // Check if this is actually an update
      const previousVersion = repoActions[0]?.versionRef || 'unknown';
      if (newVersionRef === previousVersion && !options.useLatest) {
        continue; // Skip if no update needed
      }

      console.log(`Updating ${orgRepo} from ${previousVersion} to ${newVersionRef}`);

      // Update all actions from this repo using the add function (which handles replacement)
      const addOptions: GenerateActionFilesOptions = {
        orgRepoRef: `${orgRepo}@${newVersionRef}`,
        outputDir: options.outputDir,
        token: token,
        useSha: options.useSha
      };

      const result = await generateActionFiles(context, addOptions);

      // Report updates for all actions in the repo
      if (result.actions && result.actions.length > 0) {
        for (const action of result.actions) {
          updated.push({
            orgRepo: orgRepo + (action.actionPath ? `/${action.actionPath}` : ''),
            previousVersion,
            newVersion: newVersionRef,
            filePath: action.filePath
          });
        }
      } else {
        // Fallback for single action
        updated.push({
          orgRepo,
          previousVersion,
          newVersion: newVersionRef,
          filePath: result.filePath
        });
      }

    } catch (error) {
      errors.push({
        orgRepo,
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

/**
 * Creates a temporary directory for cloning repos
 */
function createTempDir(): string {
  return fs.mkdtempSync(os.tmpdir() + '/action-yml-');
}

/**
 * Clones a repository to a temporary directory
 */
async function cloneRepoToTemp(owner: string, repo: string, ref: string | undefined, token: string | undefined, tmpDir: string) {
  const url = token
    ? `https://${token}:x-oauth-basic@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;
  const cloneOptions: Record<string, any> = { '--depth': 1 };
  if (ref) cloneOptions['--branch'] = ref;
  await cloneRepo(url, tmpDir, cloneOptions);
}

/**
 * Cleans up a temporary directory
 */
function cleanupTempDir(tmpDir: string) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Updates the index file for a repository containing multiple actions
 */
async function updateRepoIndexFile(repoDir: string, actions: GeneratedAction[]) {
  const indexPath = path.join(repoDir, 'index.ts');
  const exports: string[] = [];

  for (const action of actions) {
    const relativePath = action.actionPath
      ? `./${action.actionPath}/${action.actionName}`
      : `./${action.actionName}`;
    exports.push(`export * from '${relativePath}';`);
  }

  const content = exports.join('\n') + '\n';
  const formattedContent = await formatWithPrettier(content);
  fs.writeFileSync(indexPath, formattedContent, 'utf8');
}