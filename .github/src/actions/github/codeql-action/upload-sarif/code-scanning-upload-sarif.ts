import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type CodeScanningUploadSARIFInputs = {
  /** The SARIF file or directory of SARIF files to be uploaded to GitHub code scanning.
See https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github#uploading-a-code-scanning-analysis-with-github-actions
for information on the maximum number of results and maximum file size supported by code scanning.
 | default: "../results" */
  sarif_file?: GitHubActionInputValue;
  /** The path at which the analyzed repository was checked out. Used to relativize any absolute paths in the uploaded SARIF file. | default: "${{ github.workspace }}" */
  checkout_path?: GitHubActionInputValue;
  /** The ref where results will be uploaded. If not provided, the Action will use the GITHUB_REF environment variable. If provided, the sha input must be provided as well. This input is ignored for pull requests from forks. */
  ref?: GitHubActionInputValue;
  /** The sha of the HEAD of the ref where results will be uploaded. If not provided, the Action will use the GITHUB_SHA environment variable. If provided, the ref input must be provided as well. This input is ignored for pull requests from forks. */
  sha?: GitHubActionInputValue;
  /** GitHub token to use for authenticating with this instance of GitHub. The token must be the built-in GitHub Actions token, and the workflow must have the `security-events: write` permission. Most of the time it is advisable to avoid specifying this input so that the workflow falls back to using the default value. | default: "${{ github.token }}" */
  token?: GitHubActionInputValue;
  /** default: "${{ toJson(matrix) }}" */
  matrix?: GitHubActionInputValue;
  /** String used by Code Scanning for matching the analyses */
  category?: GitHubActionInputValue;
  /** If true, the Action will wait for the uploaded SARIF to be processed before completing. | default: "true" */
  "wait-for-processing": GitHubActionInputValue;
};
export type CodeScanningUploadSARIFOutputs = {
  /** The ID of the uploaded SARIF file. */
  "sarif-id": string;
};
/**
  Upload the analysis results

  https://github.com/github/codeql-action/upload-sarif/tree/v3
*/
export function codeScanningUploadSARIF(
  inputs: CodeScanningUploadSARIFInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<CodeScanningUploadSARIFInputs> {
  return createStep(
    "github/codeql-action/upload-sarif",
    { ...step, with: inputs },
    ref ?? "528ca598d956c91826bd742262cdfc5d02b77710",
  );
}
