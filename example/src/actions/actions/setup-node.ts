import { GitHubOutputValue, GitHubAction } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepAction,
  GitHubInputValue,
} from "@dotgithub/core";
import type { ActionCollection } from "@dotgithub/core";

/** Input parameters for the Setup Node.js environment action */
export type SetupNodeInputs = {
  /** Set always-auth in npmrc. | default: "false" */
  "always-auth"?: GitHubInputValue;
  /** Version Spec of the version to use. Examples: 12.x, 10.15.1, >=10.15.0. */
  "node-version"?: GitHubInputValue;
  /** File containing the version Spec of the version to use.  Examples: package.json, .nvmrc, .node-version, .tool-versions. */
  "node-version-file"?: GitHubInputValue;
  /** Target architecture for Node to use. Examples: x86, x64. Will use system architecture by default. */
  architecture?: GitHubInputValue;
  /** Set this option if you want the action to check for the latest available version that satisfies the version spec. | default: false */
  "check-latest"?: GitHubInputValue;
  /** Optional registry to set up for auth. Will set the registry in a project level .npmrc and .yarnrc file, and set up auth to read in from env.NODE_AUTH_TOKEN. */
  "registry-url"?: GitHubInputValue;
  /** Optional scope for authenticating against scoped registries. Will fall back to the repository owner when using the GitHub Packages registry (https://npm.pkg.github.com/). */
  scope?: GitHubInputValue;
  /** Used to pull node distributions from node-versions. Since there's a default, this is typically not supplied by the user. When running this action on github.com, the default value is sufficient. When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting. | default: "${{ github.server_url == 'https://github.com' && github.token || '' }}" */
  token?: GitHubInputValue;
  /** Used to specify a package manager for caching in the default directory. Supported values: npm, yarn, pnpm. */
  cache?: GitHubInputValue;
  /** Set to false to disable automatic caching based on the package manager field in package.json. By default, caching is enabled if the package manager field is present. | default: true */
  "package-manager-cache"?: GitHubInputValue;
  /** Used to specify the path to a dependency file: package-lock.json, yarn.lock, etc. Supports wildcards or a list of file names for caching multiple dependencies. */
  "cache-dependency-path"?: GitHubInputValue;
  /** Used to specify an alternative mirror to downlooad Node.js binaries from */
  mirror?: GitHubInputValue;
  /** The token used as Authorization header when fetching from the mirror */
  "mirror-token"?: GitHubInputValue;
};

export const SetupNodeOutputs = {
  /** A boolean value to indicate if a cache was hit. */
  "cache-hit": new GitHubOutputValue("cache-hit"),
  /** The installed node version. */
  "node-version": new GitHubOutputValue("node-version"),
};

export type SetupNodeOutputsType = typeof SetupNodeOutputs;

export class SetupNode extends GitHubAction<SetupNodeInputs, SetupNodeOutputsType> {
  protected uses = "actions/setup-node";
  protected fallbackRef = "a0853c24544627f65ddf259abe73b1d18a591444";
  protected outputs = SetupNodeOutputs;

  constructor(collection: ActionCollection) {
    super(collection);
  }
}
