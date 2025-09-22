import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

/** Input parameters for the Setup Node action */
export type SetupNodeInputs = {
  /** Node.js version to use */
  "node-version"?: GitHubActionInputValue;
  /** Used to specify a package manager for caching in the default directory */
  cache?: GitHubActionInputValue;
  /** Used to specify the path to a dependency file */
  "cache-dependency-path"?: GitHubActionInputValue;
};

/**
 * Setup Node.js environment
 * @param inputs - Input parameters for the action
 * @param stepOptions - Additional step options
 * @returns GitHub step
 */
export function setupNode(
  inputs: SetupNodeInputs = {},
  stepOptions: Partial<GitHubStepBase> = {}
): GitHubStep {
  return createStep({
    name: stepOptions.name || "Setup Node.js",
    uses: "actions/setup-node@v4",
    with: inputs,
    ...stepOptions,
  });
}
