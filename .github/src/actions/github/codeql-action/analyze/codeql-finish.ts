import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type CodeQLFinishInputs = {
  /** The name of the check run to add text to. */
  check_name?: GitHubActionInputValue;
  /** The path of the directory in which to save the SARIF results | default: "../results" */
  output?: GitHubActionInputValue;
  /** Upload the SARIF file to Code Scanning. Defaults to 'always' which uploads the SARIF file to Code Scanning for successful and failed runs. 'failure-only' only uploads debugging information to Code Scanning if the workflow run fails, for users post-processing the SARIF file before uploading it to Code Scanning. 'never' avoids uploading the SARIF file to Code Scanning, even if the code scanning run fails. This is not recommended for external users since it complicates debugging. | default: "always" */
  upload?: GitHubActionInputValue;
  /** DEPRECATED. This option is ignored since, for performance reasons, the CodeQL Action automatically manages cleanup of intermediate results. */
  "cleanup-level"?: GitHubActionInputValue;
  /** The amount of memory in MB that can be used by CodeQL for database finalization and query execution. By default, this action will use the same amount of memory as previously set in the "init" action. If the "init" action also does not have an explicit "ram" input, this action will use most of the memory available in the system (which for GitHub-hosted runners is 6GB for Linux, 5.5GB for Windows, and 13GB for macOS). */
  ram?: GitHubActionInputValue;
  /** Specify whether or not to add code snippets to the output sarif file. | default: "false" */
  "add-snippets"?: GitHubActionInputValue;
  /** If this option is set, the CodeQL database will be built but no queries will be run on it. Thus, no results will be produced. | default: "false" */
  "skip-queries"?: GitHubActionInputValue;
  /** The number of threads that can be used by CodeQL for database finalization and query execution. By default, this action will use the same number of threads as previously set in the "init" action. If the "init" action also does not have an explicit "threads" input, this action will use all the hardware threads available in the system (which for GitHub-hosted runners is 2 for Linux and Windows and 3 for macOS). */
  threads?: GitHubActionInputValue;
  /** The path at which the analyzed repository was checked out. Used to relativize any absolute paths in the uploaded SARIF file. | default: "${{ github.workspace }}" */
  checkout_path?: GitHubActionInputValue;
  /** The ref where results will be uploaded. If not provided, the Action will use the GITHUB_REF environment variable. If provided, the sha input must be provided as well. This input is ignored for pull requests from forks. */
  ref?: GitHubActionInputValue;
  /** The sha of the HEAD of the ref where results will be uploaded. If not provided, the Action will use the GITHUB_SHA environment variable. If provided, the ref input must be provided as well. This input is ignored for pull requests from forks. */
  sha?: GitHubActionInputValue;
  /** String used by Code Scanning for matching the analyses */
  category?: GitHubActionInputValue;
  /** Whether to upload the resulting CodeQL database | default: "true" */
  "upload-database"?: GitHubActionInputValue;
  /** If true, the Action will wait for the uploaded SARIF to be processed before completing. | default: "true" */
  "wait-for-processing": GitHubActionInputValue;
  /** GitHub token to use for authenticating with this instance of GitHub. The token must be the built-in GitHub Actions token, and the workflow must have the `security-events: write` permission. Most of the time it is advisable to avoid specifying this input so that the workflow falls back to using the default value. | default: "${{ github.token }}" */
  token?: GitHubActionInputValue;
  /** default: "${{ toJson(matrix) }}" */
  matrix?: GitHubActionInputValue;
  /** [Internal] It is an error to use this input outside of integration testing of the codeql-action. | default: "false" */
  "expect-error"?: GitHubActionInputValue;
};
export type CodeQLFinishOutputs = {
  /** A map from language to absolute path for each database created by CodeQL. */
  "db-locations": string;
  /** Absolute, local path to the directory containing the generated SARIF file. */
  "sarif-output": string;
  /** The ID of the uploaded SARIF file. */
  "sarif-id": string;
};
/**
  Finalize CodeQL database

  https://github.com/github/codeql-action/analyze/tree/v3
*/
export function codeQLFinish(
  inputs: CodeQLFinishInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<CodeQLFinishInputs> {
  return createStep(
    "github/codeql-action/analyze",
    { ...step, with: inputs },
    ref ?? "528ca598d956c91826bd742262cdfc5d02b77710",
  );
}
