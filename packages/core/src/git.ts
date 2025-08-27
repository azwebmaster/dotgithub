import simpleGit from 'simple-git';
import type { SimpleGit } from 'simple-git';

export async function cloneRepo(url: string, tmpDir: string, cloneOptions: Record<string, any>): Promise<void> {
  const git: SimpleGit = simpleGit();
  await git.clone(url, tmpDir, cloneOptions);
}
