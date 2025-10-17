import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDefaultBranch } from './github.js';
import { cloneRepo } from './git.js';
import { readActionYml } from './action-yml.js';
import { generateTypesFromYml } from './typegen.js';

export interface GenerateTypesResult {
  yaml: any;
  type: string;
}

/**
 * Clones a GitHub repo, checks out a ref, reads action.yml, and generates a TypeScript type.
 * @param orgRepo e.g. 'actions/checkout'
 * @param ref tag/sha/branch (optional, defaults to default branch)
 * @param token GitHub token (optional, overrides env GITHUB_TOKEN)
 * @param versionRef user-friendly version reference to use in generated code
 * @param customActionName custom action name to override the YAML name
 */
export async function generateTypesFromActionYml(
  orgRepo: string,
  ref?: string,
  token?: string,
  versionRef?: string,
  customActionName?: string,
  actionPath?: string
): Promise<GenerateTypesResult> {
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

  if (actionPath) {
    // Use generateTypesFromActionYmlAtPath for actions with actionPath
    const result = generateTypesFromActionYmlAtPath(
      tmpDir,
      actionPath,
      orgRepo,
      ref,
      versionRef,
      customActionName
    );
    cleanupTempDir(tmpDir);
    return result;
  } else {
    // Use the original logic for actions without actionPath
    const yml = readActionYml(tmpDir);
    const type = generateTypesFromYml(
      yml,
      orgRepo,
      ref,
      versionRef,
      customActionName,
      undefined
    );
    cleanupTempDir(tmpDir);
    return { yaml: yml, type };
  }
}

function createTempDir(): string {
  return fs.mkdtempSync(os.tmpdir() + '/action-yml-');
}

async function cloneRepoToTemp(
  owner: string,
  repo: string,
  ref: string | undefined,
  token: string | undefined,
  tmpDir: string
) {
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
 * Finds all action.yml or action.yaml files in a repository directory
 * @param repoDir Directory containing the cloned repository
 * @returns Array of paths relative to repoDir where action files were found
 */
export function findAllActionsInRepo(repoDir: string): string[] {
  const actionPaths: string[] = [];

  function searchDirectory(dir: string, relativePath: string = '') {
    // Check for action.yml or action.yaml in current directory
    const actionYmlPath = path.join(dir, 'action.yml');
    const actionYamlPath = path.join(dir, 'action.yaml');

    if (fs.existsSync(actionYmlPath) || fs.existsSync(actionYamlPath)) {
      actionPaths.push(relativePath);
    }

    // Search subdirectories (skip .git and node_modules)
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        entry.name !== '.git' &&
        entry.name !== 'node_modules' &&
        entry.name !== '.github' &&
        !entry.name.startsWith('.')
      ) {
        const subDir = path.join(dir, entry.name);
        const subRelativePath = relativePath
          ? path.join(relativePath, entry.name)
          : entry.name;
        searchDirectory(subDir, subRelativePath);
      }
    }
  }

  searchDirectory(repoDir);
  return actionPaths;
}

/**
 * Generates types for an action at a specific path within a cloned repo
 * @param tmpDir Temporary directory containing the cloned repo
 * @param actionPath Path to the action directory within the repo (empty string for root)
 * @param orgRepo Organization/repository string
 * @param ref Reference to use in generated code
 * @param versionRef User-friendly version reference
 * @param customActionName Custom action name to override the YAML name
 */
export function generateTypesFromActionYmlAtPath(
  tmpDir: string,
  actionPath: string,
  orgRepo: string,
  ref: string,
  versionRef?: string,
  customActionName?: string
): GenerateTypesResult {
  const actionDir = actionPath ? path.join(tmpDir, actionPath) : tmpDir;
  const yml = readActionYml(actionDir);
  // For actions in subdirectories, include the action path in the repo string
  const repoForUses = actionPath ? `${orgRepo}/${actionPath}` : orgRepo;
  const type = generateTypesFromYml(
    yml,
    repoForUses,
    ref,
    versionRef,
    customActionName,
    actionPath
  );
  return { yaml: yml, type };
}
