import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

/** Input parameters for the Cache action */
export type CacheInputs = {
  /** A list of files, directories, and wildcard patterns to cache and restore */
  path?: GitHubActionInputValue;
  /** An explicit key for restoring and saving the cache */
  key?: GitHubActionInputValue;
  /** An ordered list of prefix-matched keys to use for finding a cache */
  "restore-keys"?: GitHubActionInputValue;
};

/**
 * Cache dependencies and build outputs
 * @param inputs - Input parameters for the action
 * @param stepOptions - Additional step options
 * @returns GitHub step
 */
export function cache(
  inputs: CacheInputs = {},
  stepOptions: Partial<GitHubStepBase> = {}
): GitHubStep {
  return createStep({
    name: stepOptions.name || "Cache",
    uses: "actions/cache@v3",
    with: inputs,
    ...stepOptions,
  });
}
