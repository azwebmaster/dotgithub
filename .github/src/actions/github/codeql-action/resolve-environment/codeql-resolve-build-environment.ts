import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type CodeQLResolveBuildEnvironmentInputs = {
  /** GitHub token to use for authenticating with this instance of GitHub. The token must be the built-in GitHub Actions token, and the workflow must have the `security-events: write` permission. Most of the time it is advisable to avoid specifying this input so that the workflow falls back to using the default value. | default: "${{ github.token }}" */
  token?: GitHubActionInputValue;
  /** default: "${{ toJson(matrix) }}" */
  matrix?: GitHubActionInputValue;
  /** The language to infer the build environment configuration for. */
  language: GitHubActionInputValue;
  /** Resolve the build environment based on the files located at the specified path (relative to $GITHUB_WORKSPACE). If this input is not set, then the build environment is resolved based on the files in $GITHUB_WORKSPACE. */
  "working-directory"?: GitHubActionInputValue;
};
export type CodeQLResolveBuildEnvironmentOutputs = {
  /** The inferred build environment configuration. */
  environment: string;
};
/**
  [Experimental] Attempt to infer a build environment suitable for automatic builds

  https://github.com/github/codeql-action/resolve-environment/tree/v3
*/
export function codeQLResolveBuildEnvironment(
  inputs: CodeQLResolveBuildEnvironmentInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<CodeQLResolveBuildEnvironmentInputs> {
  return createStep(
    "github/codeql-action/resolve-environment",
    { ...step, with: inputs },
    ref ?? "528ca598d956c91826bd742262cdfc5d02b77710",
  );
}
