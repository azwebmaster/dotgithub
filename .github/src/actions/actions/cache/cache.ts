import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type CacheInputs = {
  /** A list of files, directories, and wildcard patterns to cache and restore */
  path: GitHubActionInputValue;
  /** An explicit key for restoring and saving the cache */
  key: GitHubActionInputValue;
  /** An ordered multiline string listing the prefix-matched keys, that are used for restoring stale cache if no cache hit occurred for key. Note `cache-hit` returns false in this case. */
  "restore-keys"?: GitHubActionInputValue;
  /** The chunk size used to split up large files during upload, in bytes */
  "upload-chunk-size"?: GitHubActionInputValue;
  /** An optional boolean when enabled, allows windows runners to save or restore caches that can be restored or saved respectively on other platforms | default: "false" */
  enableCrossOsArchive?: GitHubActionInputValue;
  /** Fail the workflow if cache entry is not found | default: "false" */
  "fail-on-cache-miss"?: GitHubActionInputValue;
  /** Check if a cache entry exists for the given input(s) (key, restore-keys) without downloading the cache | default: "false" */
  "lookup-only"?: GitHubActionInputValue;
  /** Run the post step to save the cache even if another step before fails | default: "false" */
  "save-always"?: GitHubActionInputValue;
};
export type CacheOutputs = {
  /** A boolean value to indicate an exact match was found for the primary key */
  "cache-hit": string;
};
/**
  Cache artifacts like dependencies and build outputs to improve workflow execution time

  https://github.com/actions/cache/tree/v4
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
