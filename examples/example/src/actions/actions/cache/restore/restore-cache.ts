import { GitHubOutputValue, ActionConstruct } from "@dotgithub/core";
import type {
  GitHubInputValue,
  ActionConstructProps,
  Construct,
} from "@dotgithub/core";

/** Input parameters for the Restore Cache action */
export type RestoreCacheRestoreInputs = {
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

export const RestoreCacheRestoreOutputs = {
  /** A boolean value to indicate an exact match was found for the primary key */
  "cache-hit": new GitHubOutputValue("cache-hit"),
  /** A resolved cache key for which cache match was attempted */
  "cache-primary-key": new GitHubOutputValue("cache-primary-key"),
  /** Key of the cache that was restored, it could either be the primary key on cache-hit or a partial/complete match of one of the restore keys */
  "cache-matched-key": new GitHubOutputValue("cache-matched-key"),
};

export type RestoreCacheRestoreOutputsType = typeof RestoreCacheRestoreOutputs;

/**
 * Restore Cache artifacts like dependencies and build outputs to improve workflow execution time
 *
 * @see {@link https://github.com/actions/cache/restore/tree/v4} - GitHub repository and documentation
 */
export class RestoreCacheRestore extends ActionConstruct<
  RestoreCacheRestoreInputs,
  RestoreCacheRestoreOutputsType
> {
  protected readonly uses = "actions/cache/restore";
  protected readonly fallbackRef = "0057852bfaa89a56745cba8c7296529d2fc39830";
  protected readonly outputs = RestoreCacheRestoreOutputs;

  constructor(
    scope: Construct | undefined,
    id: string,
    props: ActionConstructProps<RestoreCacheRestoreInputs>,
  ) {
    super(scope, id, props);
  }
}
