import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubInputValue,
} from "@dotgithub/core";

/** Input parameters for the Save a cache action */
export type SaveACacheInputs = {
  /** A list of files, directories, and wildcard patterns to cache */
  path: GitHubInputValue;
  /** An explicit key for saving the cache */
  key: GitHubInputValue;
  /** The chunk size used to split up large files during upload, in bytes */
  "upload-chunk-size"?: GitHubInputValue;
  /** An optional boolean when enabled, allows windows runners to save caches that can be restored on other platforms | default: "false" */
  enableCrossOsArchive?: GitHubInputValue;
};

/**
 * Save Cache artifacts like dependencies and build outputs to improve workflow execution time
 *
 * https://github.com/actions/cache/save/tree/v4
 * @param inputs Required input parameters
 * @param step Optional step configuration overrides
 * @param ref Optional git reference (defaults to the version used for generation)
 * @returns A GitHub step configuration
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
