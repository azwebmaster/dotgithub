import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubInputValue,
} from "@dotgithub/core";

/** Input parameters for the Setup Node.js environment action */
export type SetupNodeJsEnvironmentInputs = {
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
/** Output parameters for the Setup Node.js environment action */
export type SetupNodeJsEnvironmentOutputs = {
  /** A boolean value to indicate if a cache was hit. */
  "cache-hit": string;
  /** The installed node version. */
  "node-version": string;
};

/**
 * Setup a Node.js environment by adding problem matchers and optionally downloading and adding it to the PATH.
 *
 * https://github.com/actions/setup-node/tree/v5
 * @param inputs Optional input parameters
 * @param step Optional step configuration overrides
 * @param ref Optional git reference (defaults to the version used for generation)
 * @returns A GitHub step configuration
 */
export function setupNodeJsEnvironment(
  inputs?: SetupNodeJsEnvironmentInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<SetupNodeJsEnvironmentInputs> {
  return createStep(
    "actions/setup-node",
    { ...step, with: inputs },
    ref ?? "a0853c24544627f65ddf259abe73b1d18a591444",
  );
}
