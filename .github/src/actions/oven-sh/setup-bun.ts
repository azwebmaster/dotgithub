import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubInputValue,
} from "@dotgithub/core";

/** Input parameters for the Setup Bun action */
export type SetupBunInputs = {
  /** The version of Bun to install. (e.g. "latest", "canary", "1.0.0", "1.0.x", <sha>) */
  "bun-version"?: GitHubInputValue;
  /** The version of Bun to install from file. (e.g. "package.json", ".bun-version", ".tool-versions") | default: null */
  "bun-version-file"?: GitHubInputValue;
  /** Override the URL to download Bun from. This skips version resolution and verifying AVX2 support. */
  "bun-download-url"?: GitHubInputValue;
  /** The URL of the package registry to use for installing Bun. Set the $BUN_AUTH_TOKEN environment variable to authenticate with the registry. */
  "registry-url"?: GitHubInputValue;
  /** The scope for authenticating with the package registry. */
  scope?: GitHubInputValue;
  /** Disable caching of bun executable. | default: false */
  "no-cache"?: GitHubInputValue;
};
/** Output parameters for the Setup Bun action */
export type SetupBunOutputs = {
  /** The version of Bun that was installed. */
  "bun-version": string;
  /** The revision of Bun that was installed. */
  "bun-revision": string;
  /** The path to the Bun executable. */
  "bun-path": string;
  /** The URL from which Bun was downloaded. */
  "bun-download-url": string;
  /** If the version of Bun was cached. */
  "cache-hit": string;
};

/**
 * Download, install, and setup Bun to your path.
 *
 * https://github.com/oven-sh/setup-bun/tree/v2
 * @param inputs Optional input parameters
 * @param step Optional step configuration overrides
 * @param ref Optional git reference (defaults to the version used for generation)
 * @returns A GitHub step configuration
 */
export function setupBun(
  inputs?: SetupBunInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<SetupBunInputs> {
  return createStep(
    "oven-sh/setup-bun",
    { ...step, with: inputs },
    ref ?? "735343b667d3e6f658f44d0eca948eb6282f2b76",
  );
}
