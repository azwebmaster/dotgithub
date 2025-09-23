import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubInputValue,
} from "@dotgithub/core";

/** Input parameters for the Changesets action */
export type ChangesetsInputs = {
  /** The command to use to build and publish packages */
  publish?: GitHubInputValue;
  /** The command to update version, edit CHANGELOG, read and delete changesets. Default to `changeset version` if not provided */
  version?: GitHubInputValue;
  /** Sets the cwd for the node process. Default to `process.cwd()` */
  cwd?: GitHubInputValue;
  /** The commit message. Default to `Version Packages`
   */
  commit?: GitHubInputValue;
  /** The pull request title. Default to `Version Packages` */
  title?: GitHubInputValue;
  /** Sets up the git user for commits as `"github-actions[bot]"`. Default to `true` | default: true */
  setupGitUser?: GitHubInputValue;
  /** A boolean value to indicate whether to create Github releases after `publish` or not | default: true */
  createGithubReleases?: GitHubInputValue;
  /** An enum to specify the commit mode. Use "git-cli" to push changes using the Git CLI, or "github-api" to push changes via the GitHub API. When using "github-api", all commits and tags are signed using GitHub's GPG key and attributed to the user or app who owns the GITHUB_TOKEN.
     | default: "git-cli" */
  commitMode?: GitHubInputValue;
  /** Sets the branch in which the action will run. Default to `github.ref_name` if not provided */
  branch?: GitHubInputValue;
};
/** Output parameters for the Changesets action */
export type ChangesetsOutputs = {
  /** A boolean value to indicate whether a publishing is happened or not */
  published: string;
  /** A JSON array to present the published packages. The format is `[{"name": "@xx/xx", "version": "1.2.0"}, {"name": "@xx/xy", "version": "0.8.9"}]`
   */
  publishedPackages: string;
  /** A boolean about whether there were changesets. Useful if you want to create your own publishing functionality. */
  hasChangesets: string;
  /** The pull request number that was created or updated */
  pullRequestNumber: string;
};

/**
 * A GitHub action to automate releases with Changesets
 *
 * https://github.com/changesets/action/tree/v1.5.3
 * @param inputs Optional input parameters
 * @param step Optional step configuration overrides
 * @param ref Optional git reference (defaults to the version used for generation)
 * @returns A GitHub step configuration
 */
export function changesets(
  inputs?: ChangesetsInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<ChangesetsInputs> {
  return createStep(
    "changesets/action",
    { ...step, with: inputs },
    ref ?? "8eb63fb4cfc7f9643537c7d39d0b68c835012a19",
  );
}
