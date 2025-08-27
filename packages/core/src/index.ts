import * as fs from 'fs';
import * as os from 'os';
import { getDefaultBranch } from './github';
import { cloneRepo } from './git';
import { readActionYml } from './action-yml';
import { generateTypesFromYml } from './typegen';

export function helloCore(): string {
  return 'Hello from @dotgithub/core!';
}

export interface GenerateTypesResult {
  yaml: any;
  type: string;
}

/**
 * Clones a GitHub repo, checks out a ref, reads action.yml, and generates a TypeScript type.
 * @param orgRepo e.g. 'actions/checkout'
 * @param ref tag/sha/branch (optional, defaults to default branch)
 * @param token GitHub token (optional, overrides env GITHUB_TOKEN)
 */
export async function generateTypesFromActionYml(orgRepo: string, ref?: string, token?: string): Promise<GenerateTypesResult> {
  const [owner, repo] = orgRepo.split('/');
  if (!owner || !repo) throw new Error('orgRepo must be in the form org/repo');
  token = token || process.env.GITHUB_TOKEN;

  if (!ref) {
    ref = await getDefaultBranch(owner, repo, token);
  }

  const tmpDir = createTempDir();
  await cloneRepoToTemp(owner, repo, ref, token, tmpDir);
  const yml = readActionYml(tmpDir);
  const type = generateTypesFromYml(yml);
  cleanupTempDir(tmpDir);
  return { yaml: yml, type };
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
