import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

/** Input parameters for the Checkout action */
export type CheckoutInputs = {
  /** Repository name with owner. For example, actions/checkout | default: "${{ github.repository }}" */
  repository?: GitHubActionInputValue;
  /** The branch, tag or SHA to checkout. When checking out the repository that triggered a workflow, this defaults to the reference or SHA for that event.  Otherwise, uses the default branch. */
  ref?: GitHubActionInputValue;
  /** Personal access token (PAT) used to fetch the repository. The PAT is configured with the local git config, which enables your scripts to run authenticated git commands. The post-job step removes the PAT. */
  token?: GitHubActionInputValue;
};

/**
 * Checkout a repository
 * @param inputs - Input parameters for the action
 * @param stepOptions - Additional step options
 * @returns GitHub step
 */
export function checkout(
  inputs: CheckoutInputs = {},
  stepOptions: Partial<GitHubStepBase> = {}
): GitHubStep {
  return createStep({
    name: stepOptions.name || "Checkout",
    uses: "actions/checkout@v4",
    with: inputs,
    ...stepOptions,
  });
}
