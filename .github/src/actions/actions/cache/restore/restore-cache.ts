import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubInputValue,
} from "@dotgithub/core";

/** Input parameters for the Restore Cache action */
export type RestoreCacheInputs = {
  /** A list of files, directories, and wildcard patterns to restore */
  path: GitHubInputValue;
  /** An explicit key for restoring the cache */
  key: GitHubInputValue;
  /** An ordered multiline string listing the prefix-matched keys, that are used for restoring stale cache if no cache hit occurred for key. Note `cache-hit` returns false in this case. */
  "restore-keys"?: GitHubInputValue;
  /** An optional boolean when enabled, allows windows runners to restore caches that were saved on other platforms | default: "false" */
  enableCrossOsArchive?: GitHubInputValue;
  /** Fail the workflow if cache entry is not found | default: "false" */
  "fail-on-cache-miss"?: GitHubInputValue;
  /** Check if a cache entry exists for the given input(s) (key, restore-keys) without downloading the cache | default: "false" */
  "lookup-only"?: GitHubInputValue;
};
/** Output parameters for the Restore Cache action */
export type RestoreCacheOutputs = {
  /** A boolean value to indicate an exact match was found for the primary key */
  "cache-hit": string;
  /** A resolved cache key for which cache match was attempted */
  "cache-primary-key": string;
  /** Key of the cache that was restored, it could either be the primary key on cache-hit or a partial/complete match of one of the restore keys */
  "cache-matched-key": string;
};

/**
 * Restore Cache artifacts like dependencies and build outputs to improve workflow execution time
 *
 * https://github.com/actions/cache/restore/tree/v4
 * @param inputs Required input parameters
 * @param step Optional step configuration overrides
 * @param ref Optional git reference (defaults to the version used for generation)
 * @returns A GitHub step configuration
 */
export function restoreCache(
  inputs: RestoreCacheInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<RestoreCacheInputs> {
  return createStep(
    "actions/cache/restore",
    { ...step, with: inputs },
    ref ?? "0400d5f644dc74513175e3cd8d07132dd4860809",
  );
}
