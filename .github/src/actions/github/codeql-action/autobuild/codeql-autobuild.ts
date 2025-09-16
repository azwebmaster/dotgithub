import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type CodeQLAutobuildInputs = {
  /** GitHub token to use for authenticating with this instance of GitHub. The token needs the `security-events: write` permission. | default: "${{ github.token }}" */
  token?: GitHubActionInputValue;
  /** default: "${{ toJson(matrix) }}" */
  matrix?: GitHubActionInputValue;
  /** Run the autobuilder using this path (relative to $GITHUB_WORKSPACE) as working directory. If this input is not set, the autobuilder runs with $GITHUB_WORKSPACE as its working directory. */
  "working-directory"?: GitHubActionInputValue;
};
/**
  Attempt to automatically build the code. Only used for analyzing languages that require a build. Use the `build-mode: autobuild` input in the `init` action instead.

  https://github.com/github/codeql-action/autobuild/tree/v3
*/
export function codeQLAutobuild(
  inputs?: CodeQLAutobuildInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<CodeQLAutobuildInputs> {
  return createStep(
    "github/codeql-action/autobuild",
    { ...step, with: inputs },
    ref ?? "528ca598d956c91826bd742262cdfc5d02b77710",
  );
}
