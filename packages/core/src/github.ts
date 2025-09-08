import { Octokit } from 'octokit';

export async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  const octokit = new Octokit(token ? { auth: token } : {});
  const repoInfo = await octokit.rest.repos.get({ owner, repo });
  return repoInfo.data.default_branch;
}

export async function getRefSha(owner: string, repo: string, ref: string, token?: string): Promise<string> {
  const octokit = new Octokit(token ? { auth: token } : {});
  
  try {
    // Try to get ref as a git reference first (branches/tags)
    const gitRef = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${ref}` });
    return gitRef.data.object.sha;
  } catch (error) {
    try {
      // Try as a tag
      const gitRef = await octokit.rest.git.getRef({ owner, repo, ref: `tags/${ref}` });
      return gitRef.data.object.sha;
    } catch (tagError) {
      try {
        // Try as a commit SHA directly
        const commit = await octokit.rest.git.getCommit({ owner, repo, commit_sha: ref });
        return commit.data.sha;
      } catch (commitError) {
        throw new Error(`Could not resolve ref "${ref}" to a SHA for ${owner}/${repo}`);
      }
    }
  }
}
