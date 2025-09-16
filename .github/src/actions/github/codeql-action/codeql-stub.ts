import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type CodeQLStubInputs = {};
/**
  Stub: Don't use this action directly. Read [the documentation](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql) instead.

  https://github.com/github/codeql-action/tree/v3
*/
export function codeQLStub(
  inputs?: CodeQLStubInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<CodeQLStubInputs> {
  return createStep(
    "github/codeql-action",
    { ...step, with: inputs },
    ref ?? "528ca598d956c91826bd742262cdfc5d02b77710",
  );
}
