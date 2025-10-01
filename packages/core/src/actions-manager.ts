import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDefaultBranch, getRefSha, getLatestTag, getLatestTagSafe } from './github';
import { generateTypesFromActionYml, findAllActionsInRepo, generateTypesFromActionYmlAtPath } from './types-generator';
import { cloneRepo } from './git';
import { addActionToConfig, writeConfig } from './config';
import type { DotGithubAction } from './config';
import { formatWithPrettier, updateOrgIndexFile, updateRootIndexFile, updateIndexFilesAfterRemoval } from './file-utils';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import { toProperCase } from './utils';
import type { DotGithubContext } from './context';

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
        console.warn(`Warning: Could not remove existing action files: ${error instanceof Error ? error.message : error}`);
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
    console.log(`Generating action files to ${rootActionDir}`);
    const repoDir = path.join(rootActionDir, owner, repo);

    for (const actionPath of actionPaths) {
      // Generate types for this action
      const refForCreateStep = useSha ? finalRef : resolvedRef;
      const refForComments = resolvedRef;
      const result = generateTypesFromActionYmlAtPath(tmpDir, actionPath, orgRepo, refForCreateStep, refForComments, options.customActionName);

      // Generate filename from action name
      // Use custom action name if provided, otherwise use the action name from YAML
      const baseActionName = options.customActionName || result.yaml.name;
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

      console.log(`Writing generated types for ${orgRepo}/${actionPath || 'root'}@${finalRef} to ${filePath}`);
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
        actionName: options.customActionName,
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

  const actionNames = actionsToRemove.map(a => {
    if (a.actionName) {
      const { generateFunctionName } = require('./utils');
      return generateFunctionName(a.actionName);
    }
    return a.orgRepo;
  }).join(', ');
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
 * Adds necessary import statements to the generated TypeScript code and removes unused imports
 * @param generatedTypes - The generated TypeScript code
 * @returns TypeScript code with only necessary import statements
 */
function addImportsToGeneratedTypes(generatedTypes: string): string {
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
  const sourceFile = project.createSourceFile(fileName, generatedTypes);

  // Remove all existing import declarations to avoid duplicates
  const existingImports = sourceFile.getImportDeclarations();
  existingImports.forEach(importDecl => importDecl.remove());

  // Analyze the generated code to determine which imports are actually used
  const usedImports = analyzeUsedImports(sourceFile);

  // Add all value imports together (these are used as values, not type-only)
  const valueImports = [];
  if (usedImports.has('GitHubOutputValue')) {
    valueImports.push('GitHubOutputValue');
  }
  if (usedImports.has('GitHubAction')) {
    valueImports.push('GitHubAction');
  }
  
  if (valueImports.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: valueImports,
    });
  }

  // Add type-only imports that are used
  const typeImports = ['GitHubStep', 'GitHubStepBase', 'GitHubStepAction', 'GitHubInputValue', 'DotGithubConfig', 'PluginContext'];
  const usedTypeImports = typeImports.filter(imp => usedImports.has(imp));
  
  if (usedTypeImports.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: usedTypeImports,
      isTypeOnly: true,
    });
  }

  if (usedImports.has('StepChainBuilder')) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: ['StepChainBuilder'],
      isTypeOnly: true,
    });
  }

  if (usedImports.has('ActionCollection')) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: ['ActionCollection'],
      isTypeOnly: true,
    });
  }

  return sourceFile.getFullText();
}

/**
 * Analyzes a TypeScript source file to determine which imports are actually used
 * @param sourceFile - The TypeScript source file to analyze
 * @returns Set of import names that are actually used in the code
 */
function analyzeUsedImports(sourceFile: SourceFile): Set<string> {
  const usedImports = new Set<string>();
  
  // Get all identifiers in the source file
  const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
  
  for (const identifier of identifiers) {
    const text = identifier.getText();
    
    // Check if this identifier matches any of our potential imports
    const potentialImports = [
      'GitHubStep',
      'GitHubStepBase', 
      'GitHubStepAction',
      'GitHubInputValue',
      'GitHubAction',
      'GitHubOutputValue',
      'DotGithubConfig',
      'PluginContext',
      'StepChainBuilder',
      'ActionCollection'
    ];
    
    if (potentialImports.includes(text)) {
      usedImports.add(text);
    }
  }
  
  return usedImports;
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

  // Add export statements for each action
  for (const action of actions) {
    const relativePath = action.actionPath
      ? `./${action.actionPath}/${action.actionName}`
      : `./${action.actionName}`;
    
    sourceFile.addExportDeclaration({
      moduleSpecifier: relativePath,
    });
  }

  const content = sourceFile.getFullText();
  const formattedContent = await formatWithPrettier(content);
  fs.writeFileSync(indexPath, formattedContent, 'utf8');
}