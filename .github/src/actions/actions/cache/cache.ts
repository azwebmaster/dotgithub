import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubInputValue,
} from "@dotgithub/core";

/** Input parameters for the Cache action */
export type CacheInputs = {
  /** A list of files, directories, and wildcard patterns to cache and restore */
  path: GitHubInputValue;
  /** An explicit key for restoring and saving the cache */
  key: GitHubInputValue;
  /** An ordered multiline string listing the prefix-matched keys, that are used for restoring stale cache if no cache hit occurred for key. Note `cache-hit` returns false in this case. */
  "restore-keys"?: GitHubInputValue;
  /** The chunk size used to split up large files during upload, in bytes */
  "upload-chunk-size"?: GitHubInputValue;
  /** An optional boolean when enabled, allows windows runners to save or restore caches that can be restored or saved respectively on other platforms | default: "false" */
  enableCrossOsArchive?: GitHubInputValue;
  /** Fail the workflow if cache entry is not found | default: "false" */
  "fail-on-cache-miss"?: GitHubInputValue;
  /** Check if a cache entry exists for the given input(s) (key, restore-keys) without downloading the cache | default: "false" */
  "lookup-only"?: GitHubInputValue;
  /** Run the post step to save the cache even if another step before fails | default: "false" */
  "save-always"?: GitHubInputValue;
};
/** Output parameters for the Cache action */
export type CacheOutputs = {
  /** A boolean value to indicate an exact match was found for the primary key */
  "cache-hit": string;
};

/**
 * Cache artifacts like dependencies and build outputs to improve workflow execution time
 *
 * https://github.com/actions/cache/tree/v4
 * @param inputs Required input parameters
 * @param step Optional step configuration overrides
 * @param ref Optional git reference (defaults to the version used for generation)
 * @returns A GitHub step configuration
 */
export function cache(
  inputs: CacheInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<CacheInputs> {
  return createStep(
    "actions/cache",
    { ...step, with: inputs },
    ref ?? "0400d5f644dc74513175e3cd8d07132dd4860809",
  );
}
