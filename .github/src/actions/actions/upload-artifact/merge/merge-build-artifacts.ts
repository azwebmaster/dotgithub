import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type MergeBuildArtifactsInputs = {
  /** The name of the artifact that the artifacts will be merged into. | default: "merged-artifacts" */
  name: GitHubActionInputValue;
  /** A glob pattern matching the artifact names that should be merged. | default: "*" */
  pattern?: GitHubActionInputValue;
  /** When multiple artifacts are matched, this changes the behavior of how they are merged in the archive. If true, the matched artifacts will be extracted into individual named directories within the specified path. If false, the matched artifacts will combined in the same directory. | default: "false" */
  "separate-directories"?: GitHubActionInputValue;
  /** Duration after which artifact will expire in days. 0 means using default retention.
Minimum 1 day. Maximum 90 days unless changed from the repository settings page.
 */
  "retention-days"?: GitHubActionInputValue;
  /** The level of compression for Zlib to be applied to the artifact archive. The value can range from 0 to 9: - 0: No compression - 1: Best speed - 6: Default compression (same as GNU Gzip) - 9: Best compression Higher levels will result in better compression, but will take longer to complete. For large files that are not easily compressed, a value of 0 is recommended for significantly faster uploads.
 | default: "6" */
  "compression-level"?: GitHubActionInputValue;
  /** If true, the artifacts that were merged will be deleted. If false, the artifacts will still exist.
 | default: "false" */
  "delete-merged"?: GitHubActionInputValue;
  /** If true, hidden files will be included in the merged artifact. If false, hidden files will be excluded from the merged artifact.
 | default: "false" */
  "include-hidden-files"?: GitHubActionInputValue;
};
export type MergeBuildArtifactsOutputs = {
  /** A unique identifier for the artifact that was just uploaded. Empty if the artifact upload failed.
This ID can be used as input to other APIs to download, delete or get more information about an artifact: https://docs.github.com/en/rest/actions/artifacts
 */
  "artifact-id": string;
  /** A download URL for the artifact that was just uploaded. Empty if the artifact upload failed.
This download URL only works for requests Authenticated with GitHub. Anonymous downloads will be prompted to first login.  If an anonymous download URL is needed than a short time restricted URL can be generated using the download artifact API: https://docs.github.com/en/rest/actions/artifacts#download-an-artifact    
This URL will be valid for as long as the artifact exists and the workflow run and repository exists. Once an artifact has expired this URL will no longer work. Common uses cases for such a download URL can be adding download links to artifacts in descriptions or comments on pull requests or issues.
 */
  "artifact-url": string;
  /** SHA-256 digest for the artifact that was just uploaded. Empty if the artifact upload failed.
   */
  "artifact-digest": string;
};
/**
  Merge one or more build Artifacts

  https://github.com/actions/upload-artifact/merge/tree/v4
*/
export function mergeBuildArtifacts(
  inputs: MergeBuildArtifactsInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<MergeBuildArtifactsInputs> {
  return createStep(
    "actions/upload-artifact/merge",
    { ...step, with: inputs },
    ref ?? "ea165f8d65b6e75b540449e92b4886f43607fa02",
  );
}
