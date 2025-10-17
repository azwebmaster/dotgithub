import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDefaultBranch, getRefSha, getLatestTag, getLatestTagSafe } from './github.js';
import { generateTypesFromActionYml, findAllActionsInRepo, generateTypesFromActionYmlAtPath } from './types-generator.js';
import { generateActionsConstructClass } from './typegen.js';
import { cloneRepo } from './git.js';
import { addActionToConfig, writeConfig } from './config.js';
import type { DotGithubAction } from './config.js';
import { formatWithPrettier, updateOrgIndexFile, updateRootIndexFile, updateIndexFilesAfterRemoval, addImportsToGeneratedTypes } from './file-utils.js';
import { logger } from './logger.js';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import { toProperCase } from './utils.js';
import type { DotGithubContext } from './context.js';

export interface GenerateActionFilesOptions {
  orgRepoRef: string;
  outputDir?: string;
  token?: string;
  useSha?: boolean;
  customActionName?: string; // Override action name for type names and function names
}

export interface LookupActionInfoOptions {
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

export interface ActionLookupResult {
  orgRepo: string;
  ref: string;
  versionRef: string;
  actions: ActionInfo[];
}

export interface ActionInfo {
  actionPath: string;
  actionName: string;
  functionName: string;
  outputPath: string;
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
 * Looks up action information without generating TypeScript code.
 * Returns action metadata including SHA, version, and action details.
 * @param options - Configuration for action lookup
 */
export async function lookupActionInfo(options: LookupActionInfoOptions): Promise<ActionLookupResult> {
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
      // Fallback to default branch if no tags available
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
    const actions = await findAllActionsInRepo(tmpDir);

    const actionInfos: ActionInfo[] = actions.map(actionPath => {
      // Extract action name from path (last segment or repo name if root)
      const actionName = actionPath ? path.basename(actionPath) : repo;
      const functionName = toProperCase(actionName);
      const outputPath = actionPath 
        ? path.join(options.outputDir || 'src', 'actions', owner, repo, actionPath, `${actionName}.ts`)
        : path.join(options.outputDir || 'src', 'actions', owner, repo, `${actionName}.ts`);

      return {
        actionPath,
        actionName,
        functionName,
        outputPath
      };
    });

    return {
      orgRepo,
      ref: finalRef,
      versionRef: resolvedRef,
      actions: actionInfos
    };
  } finally {
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
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
      // Fallback to default branch if no tags available
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

    // Found actions in repository

    // Remove existing actions for this specific orgRepo/actionPath combination
    // We need to remove actions that match the specific actionPath being added
    const actionsToRemove: DotGithubAction[] = [];
    
    for (const actionPath of actionPaths) {
      const existingActions = context.config.actions.filter(action => 
        action.orgRepo === orgRepo && 
        (action.actionPath || '') === (actionPath || '')
      );
      actionsToRemove.push(...existingActions);
    }
    
    // Remove files for the specific actions being replaced
    for (const existingAction of actionsToRemove) {
      try {
        if (existingAction.outputPath) {
          const existingPath = context.resolvePath(existingAction.outputPath);
          if (fs.existsSync(existingPath)) {
            fs.unlinkSync(existingPath);
          }
        }
      } catch (error) {
        logger.warn(`Could not remove existing action files: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    // Remove from config - only remove the specific actions being replaced
    context.config.actions = context.config.actions.filter(action => 
      !actionsToRemove.some(toRemove => 
        action.orgRepo === toRemove.orgRepo && 
        (action.actionPath || '') === (toRemove.actionPath || '')
      )
    );

    const generatedActions: GeneratedAction[] = [];
    // Use provided outputDir or fall back to config's rootDir + 'actions'
    const rootActionDir = options.outputDir ? path.resolve(options.outputDir) : context.resolvePath('actions');
    // Generating action files to output directory
    const repoDir = path.join(rootActionDir, owner, repo);

    for (const actionPath of actionPaths) {
      // Generate types for this action
      const refForCreateStep = useSha ? finalRef : resolvedRef;
      const refForComments = resolvedRef;
      const result = generateTypesFromActionYmlAtPath(tmpDir, actionPath, orgRepo, refForCreateStep, refForComments, options.customActionName);

      // Generate filename from action name
      // Use custom action name if provided, otherwise use the action name from YAML
      const baseActionName = options.customActionName || result.yaml.name || repo;
      const actionNameForFile = generateFilenameFromActionName(baseActionName);
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

      // Writing generated types to file
      // Write the TypeScript file
      fs.writeFileSync(filePath, formattedCode, 'utf8');

      // Generate function name (camelCase version of action name)
      // Use the same baseActionName from above
      const actionName = baseActionName.replace(/[^a-zA-Z0-9]/g, ' ');
      const ActionName = toProperCase(actionName.replace(/\s+/g, ' '));
      const functionName = ActionName.charAt(0).toLowerCase() + ActionName.slice(1);

      // Convert absolute filePath to relative path from rootDir
      // const relativeOutputPath = path.relative(context.resolvePath(''), filePath);
      const relativeOutputPath = context.relativePath(filePath);
      
      addActionToConfig({
        orgRepo,
        ref: useSha ? finalRef : resolvedRef,
        versionRef: resolvedRef,
        actionName: functionName, // Store the camelCase actionName to avoid recalculating
        outputPath: relativeOutputPath,
        actionPath: actionPath || undefined
      }, context);

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
    
    // Check if we need to update a shared actions directory index file
    await updateSharedActionsIndexFile(rootActionDir, generatedActions);

    // Generate ActionsConstruct class for this organization
    await generateActionsConstructForOrg(context, owner, generatedActions, rootActionDir);

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
        if (action.outputPath) {
          const resolvedPath = context.resolvePath(action.outputPath);
          if (fs.existsSync(resolvedPath)) {
            fs.unlinkSync(resolvedPath);
            removedFiles.push(resolvedPath);
          }
        }
      } catch (error) {
        logger.warn(`Could not remove action file: ${error instanceof Error ? error.message : error}`);
      }
    }

    // Remove repo directory if it exists (multiple actions case)
    try {
      if (fs.existsSync(repoDir)) {
        fs.rmSync(repoDir, { recursive: true, force: true });
        logger.debug(`Removed repository directory: ${repoDir}`);
      }

      // Remove single action file if it exists (single root action case)
      if (fs.existsSync(singleActionFile)) {
        fs.unlinkSync(singleActionFile);
        logger.debug(`Removed single action file: ${singleActionFile}`);
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
      logger.warn(`Could not clean up directories: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Remove from config
  context.config.actions = context.config.actions.filter(action => action.orgRepo !== orgRepo);

  // Save updated config
  writeConfig(context.config);

  const actionNames = actionsToRemove.map(a => {
    if (a.actionName) {
      const { generateFunctionName } = require('./utils');
      return generateFunctionName(a.actionName);
    }
    return a.orgRepo;
  }).join(', ');
  logger.debug(`Removed ${actionsToRemove.length} action(s) from ${orgRepo}`);

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

      logger.debug(`Updating ${orgRepo} from ${previousVersion} to ${newVersionRef}`);

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

  // Generate export statements manually
  const exportStatements: string[] = [];
  
  for (const action of actions) {
    // Construct the correct relative path based on the actual file structure
    // The actionName includes the .ts extension, so we need to remove it and add .js
    const fileName = action.actionName.replace('.ts', '');
    const relativePath = action.actionPath
      ? `./${action.actionPath}/${fileName}.js`
      : `./${fileName}.js`;
    
    // Add export statement
    exportStatements.push(`export * from "${relativePath}";`);
  }
  
  // Add all export statements to the source file
  sourceFile.insertText(0, exportStatements.join('\n') + '\n\n');

  const content = sourceFile.getFullText();
  const formattedContent = await formatWithPrettier(content);
  fs.writeFileSync(indexPath, formattedContent, 'utf8');
}

/**
 * Updates the index file for a shared actions directory (e.g., actions/actions/)
 * This handles the case where multiple actions from different repositories are placed in the same directory
 */
async function updateSharedActionsIndexFile(rootActionDir: string, generatedActions: GeneratedAction[]): Promise<void> {
  // Check if any of the generated actions are in a shared actions directory
  const sharedActionsDir = path.join(rootActionDir, 'actions');
  if (!fs.existsSync(sharedActionsDir)) {
    return;
  }

  // Find all actions in the shared actions directory
  const allActionFiles = fs.readdirSync(sharedActionsDir)
    .filter(file => file.endsWith('.ts') && file !== 'index.ts')
    .map(file => file.replace('.ts', ''));

  if (allActionFiles.length === 0) {
    return;
  }

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

  // Add ActionCollection import
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@dotgithub/core',
    namedImports: ['ActionCollection'],
  });

  // Add imports for each action function
  for (const actionFile of allActionFiles) {
    // Convert filename to function name (e.g., "setup-node" -> "setupNode")
    const functionName = actionFile.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    
    sourceFile.addImportDeclaration({
      moduleSpecifier: `./${actionFile}.js`,
      namedImports: [functionName],
    });
  }

  // Create ActionCollection class with bind statements
  const classDeclaration = sourceFile.addClass({
    name: 'ActionsCollection',
    isExported: true,
    extends: 'ActionCollection',
  });

  // Add bind statements for each action
  for (const actionFile of allActionFiles) {
    const functionName = actionFile.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    classDeclaration.addProperty({
      name: functionName,
      initializer: `${functionName}.bind(this)`,
    });
  }

  const indexPath = path.join(sharedActionsDir, 'index.ts');
  const content = sourceFile.getFullText();
  const formattedContent = await formatWithPrettier(content);
  fs.writeFileSync(indexPath, formattedContent, 'utf8');
}

/**
 * Generates an ActionsConstruct class for an organization based on generated actions
 */
async function generateActionsConstructForOrg(
  context: DotGithubContext,
  orgName: string,
  generatedActions: GeneratedAction[],
  rootActionDir: string
): Promise<void> {
  // Get all actions for this organization from the config
  const allOrgActions = context.config.actions.filter(action => {
    const [owner] = action.orgRepo.split('/');
    return owner === orgName;
  });

  if (allOrgActions.length === 0) {
    return;
  }

  // Group actions by organization and collect action metadata
  const orgActions = allOrgActions.map(action => {
    // Skip actions without outputPath
    if (!action.outputPath) {
      logger.warn(`Action ${action.orgRepo} has no outputPath, skipping`);
      return null;
    }

    // Extract action metadata from the generated action files
    const actionFilePath = context.resolvePath(action.outputPath);
    if (!fs.existsSync(actionFilePath)) {
      logger.warn(`Action file not found: ${actionFilePath}`);
      return null;
    }

    // Read the action file to extract metadata
    const actionContent = fs.readFileSync(actionFilePath, 'utf8');
    
    // Extract action name from the file content
    const actionNameMatch = actionContent.match(/export class (\w+) extends ActionConstruct/);
    const ActionName = actionNameMatch ? actionNameMatch[1] : action.actionName;
    
    // Extract inputs type name
    const inputsTypeMatch = actionContent.match(/export type (\w+Inputs)/);
    const inputsType = inputsTypeMatch ? inputsTypeMatch[1] : `${ActionName}Inputs`;
    
    // Extract outputs type name
    const outputsTypeMatch = actionContent.match(/export type (\w+OutputsType)/);
    const outputsType = outputsTypeMatch ? outputsTypeMatch[1] : `${ActionName}OutputsType`;
    
    // Extract uses and fallbackRef from the class
    const usesMatch = actionContent.match(/protected readonly uses = "([^"]+)"/);
    const refMatch = actionContent.match(/protected readonly fallbackRef = "([^"]+)"/);
    
    const uses = usesMatch ? usesMatch[1] : action.orgRepo;
    const ref = refMatch ? refMatch[1] : action.ref || 'main';
    
    // Extract filename from outputPath and construct relative path
    const filename = path.basename(action.outputPath, '.ts');
    
    // Use stored actionName if available, otherwise fall back to calculation
    let actionName: string;
    
    if (action.actionName) {
      // Use the stored actionName, but sanitize it for method names (handles legacy actions with spaces)
      // Check if the actionName is already in camelCase format (no spaces, starts with lowercase)
      if (!action.actionName.includes(' ') && /^[a-z]/.test(action.actionName)) {
        // Already in camelCase format, convert to PascalCase for class name
        actionName = action.actionName.charAt(0).toUpperCase() + action.actionName.slice(1);
      } else {
        // Legacy format with spaces, convert to PascalCase
        actionName = action.actionName.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        actionName = actionName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
      }
    } else {
      // Fallback to calculation for legacy actions without stored actionName
      actionName = ActionName || 'unknown';
      
      // For actions with actionPath, create a unique method name
      if (action.actionPath && ActionName) {
        // Use a simple method name based on the actionPath
        // e.g., "restore" -> "cacheRestore", "save" -> "cacheSave"
        const actionPathCapitalized = action.actionPath.charAt(0).toUpperCase() + action.actionPath.slice(1);
        // Extract the base action name from the class name (remove the actionPath suffix)
        const baseActionName = ActionName.replace(new RegExp(`${actionPathCapitalized}$`), '');
        actionName = `${baseActionName}${actionPathCapitalized}`;
      } else if (ActionName && filename !== ActionName.toLowerCase()) {
        // For actions with different filename than class name, use filename
        actionName = filename.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toUpperCase());
      }
    }
    const actionNameCamel = actionName.charAt(0).toLowerCase() + actionName.slice(1);
    
    // Extract description from JSDoc comment
    const descriptionMatch = actionContent.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/);
    const description = descriptionMatch?.[1]?.trim() || `${ActionName || actionName} action`;
    
    // Construct the relative import path from the org index file to the action file
    // The org index file is at actions/orgName/index.ts
    // The action file is at action.outputPath (e.g., actions/orgName/repo/action.ts)
    const orgIndexDir = path.dirname(path.join(rootActionDir, orgName, 'index.ts'));
    const actionFileDir = path.dirname(actionFilePath);
    const relativePath = path.relative(orgIndexDir, actionFileDir);
    
    // Construct the full import path
    const importPath = relativePath === '' 
      ? filename 
      : path.join(relativePath, filename).replace(/\\/g, '/');
    
    return {
      actionName,
      ActionName: ActionName || actionName,
      actionNameCamel,
      filename: importPath,
      repo: uses || action.actionPath || '',
      ref: ref || 'main',
      description
    };
  }).filter((action): action is NonNullable<typeof action> => action !== null);

  if (orgActions.length === 0) {
    return;
  }

  // Generate the ActionsConstruct class
  const actionsConstructCode = generateActionsConstructClass(orgName, orgActions);
  
  // Write the ActionsConstruct file
  const orgDir = path.join(rootActionDir, orgName);
  const constructFilePath = path.join(orgDir, 'index.ts');
  
  // Ensure the directory exists
  if (!fs.existsSync(orgDir)) {
    fs.mkdirSync(orgDir, { recursive: true });
  }
  
  // Format and write the file
  const formattedContent = await formatWithPrettier(actionsConstructCode);
  fs.writeFileSync(constructFilePath, formattedContent, 'utf8');
  
  logger.debug(`Generated ActionsConstruct for ${orgName} organization at ${constructFilePath}`);
}