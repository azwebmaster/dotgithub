import { GitHubOutputValue, ActionConstruct } from "@dotgithub/core";
import type {
  GitHubInputValue,
  ActionConstructProps,
  Construct,
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

export const CacheOutputs = {
  /** A boolean value to indicate an exact match was found for the primary key */
  "cache-hit": new GitHubOutputValue("cache-hit"),
};

export type CacheOutputsType = typeof CacheOutputs;

/**
 * Cache artifacts like dependencies and build outputs to improve workflow execution time
 *
 * @see {@link https://github.com/actions/cache/tree/v4} - GitHub repository and documentation
 */
export class Cache extends ActionConstruct<CacheInputs, CacheOutputsType> {
  protected readonly uses = "actions/cache";
  protected readonly fallbackRef = "0057852bfaa89a56745cba8c7296529d2fc39830";
  protected readonly outputs = CacheOutputs;

  constructor(
    scope: Construct | undefined,
    id: string,
    props: ActionConstructProps<CacheInputs>,
  ) {
    super(scope, id, props);
  }
}
