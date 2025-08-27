import { Octokit } from 'octokit';

export async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  const octokit = new Octokit(token ? { auth: token } : {});
  const repoInfo = await octokit.rest.repos.get({ owner, repo });
  return repoInfo.data.default_branch;
}
