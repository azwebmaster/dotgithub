import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type SaveACacheInputs = {
  /** A list of files, directories, and wildcard patterns to cache */
  path: GitHubActionInputValue;
  /** An explicit key for saving the cache */
  key: GitHubActionInputValue;
  /** The chunk size used to split up large files during upload, in bytes */
  "upload-chunk-size"?: GitHubActionInputValue;
  /** An optional boolean when enabled, allows windows runners to save caches that can be restored on other platforms | default: "false" */
  enableCrossOsArchive?: GitHubActionInputValue;
};
/**
  Save Cache artifacts like dependencies and build outputs to improve workflow execution time

  https://github.com/actions/cache/save/tree/v4
*/
export function saveACache(
  inputs: SaveACacheInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<SaveACacheInputs> {
  return createStep(
    "actions/cache/save",
    { ...step, with: inputs },
    ref ?? "0400d5f644dc74513175e3cd8d07132dd4860809",
  );
}
