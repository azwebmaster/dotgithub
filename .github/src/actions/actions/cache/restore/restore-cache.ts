import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type RestoreCacheInputs = {
  /** A list of files, directories, and wildcard patterns to restore */
  path: GitHubActionInputValue;
  /** An explicit key for restoring the cache */
  key: GitHubActionInputValue;
  /** An ordered multiline string listing the prefix-matched keys, that are used for restoring stale cache if no cache hit occurred for key. Note `cache-hit` returns false in this case. */
  "restore-keys"?: GitHubActionInputValue;
  /** An optional boolean when enabled, allows windows runners to restore caches that were saved on other platforms | default: "false" */
  enableCrossOsArchive?: GitHubActionInputValue;
  /** Fail the workflow if cache entry is not found | default: "false" */
  "fail-on-cache-miss"?: GitHubActionInputValue;
  /** Check if a cache entry exists for the given input(s) (key, restore-keys) without downloading the cache | default: "false" */
  "lookup-only"?: GitHubActionInputValue;
};
export type RestoreCacheOutputs = {
  /** A boolean value to indicate an exact match was found for the primary key */
  "cache-hit": string;
  /** A resolved cache key for which cache match was attempted */
  "cache-primary-key": string;
  /** Key of the cache that was restored, it could either be the primary key on cache-hit or a partial/complete match of one of the restore keys */
  "cache-matched-key": string;
};
/**
  Restore Cache artifacts like dependencies and build outputs to improve workflow execution time

  https://github.com/actions/cache/restore/tree/v4
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
