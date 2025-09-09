import { Octokit } from 'octokit';
import * as semver from 'semver';

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

export async function getLatestTag(owner: string, repo: string, token?: string): Promise<string> {
  const octokit = new Octokit(token ? { auth: token } : {});
  
  try {
    // Get all tags from the repository
    const tags = await octokit.rest.repos.listTags({ owner, repo, per_page: 100 });
    
    if (tags.data.length === 0) {
      throw new Error(`No tags found for ${owner}/${repo}`);
    }
    
    // Separate tags into major-only tags and full semver tags
    const allTags = tags.data.map(tag => tag.name);
    
    // First, look for major version only tags (e.g., v4, v3, 4, 3)
    const majorVersionTags = allTags.filter(tag => {
      const normalizedTag = tag.replace(/^v/, ''); // Remove 'v' prefix if present
      const majorVersionPattern = /^\d+$/; // Only digits, no dots
      return majorVersionPattern.test(normalizedTag);
    });
    
    // Sort major version tags by numeric value (descending)
    const sortedMajorTags = majorVersionTags.sort((a, b) => {
      const aMajor = parseInt(a.replace(/^v/, ''), 10);
      const bMajor = parseInt(b.replace(/^v/, ''), 10);
      return bMajor - aMajor; // Descending order
    });
    
    // If we have major version tags, use the highest one
    if (sortedMajorTags.length > 0) {
      const latestMajorTag = sortedMajorTags[0];
      if (!latestMajorTag) {
        throw new Error(`Unexpected error: no major version tag found despite having ${sortedMajorTags.length} tags`);
      }
      return latestMajorTag;
    }
    
    // Fallback to full semver tags if no major-only tags found
    const validTags = allTags
      .filter(tagName => semver.valid(tagName))
      .sort(semver.rcompare); // Use semver.rcompare directly for descending order
    
    if (validTags.length === 0) {
      // If no valid semver tags, fallback to the latest tag by date
      const firstTag = tags.data[0]?.name;
      if (!firstTag) {
        throw new Error(`No tags found for ${owner}/${repo}`);
      }
      return firstTag;
    }
    
    const latestTag = validTags[0];
    if (!latestTag) {
      throw new Error(`No valid semver tags found for ${owner}/${repo}`);
    }
    return latestTag;
  } catch (error) {
    throw new Error(`Failed to get latest tag for ${owner}/${repo}: ${error instanceof Error ? error.message : error}`);
  }
}

export async function getLatestTagSafe(owner: string, repo: string, token: string | undefined): Promise<string> {
  return getLatestTag(owner, repo, token);
}
