import type { GitHubWorkflows } from "./workflow";

/**
 * Root resources for a .github directory structure including workflows.
 * Represents the complete .github directory with all workflows and other resources.
 */
export type DotGitHubRootResources = DotGitHubResources & { workflows: GitHubWorkflows };

/**
 * Collection of resources in a .github directory.
 * Maps resource names to their configurations.
 */
export type DotGitHubResources = Record<string, DotGitHubResource>;

/**
 * Represents a resource in the .github directory structure.
 * Can be either a file with content or a directory with child resources.
 */
export type DotGitHubResource = {
  /** File content, if this resource is a file */
  content?: unknown;
  /** Child resources, if this resource is a directory */
  children?: DotGitHubResources;
}

/**
 * Complete representation of a .github directory structure.
 * Includes all workflows and other GitHub configuration resources.
 */
export type DotGitHub = DotGitHubRootResources;

/**
 * Possible values for GitHub Action inputs.
 * Actions can accept string, boolean, or numeric input values.
 */
export type GitHubInputValue = string | boolean | number;

/**
 * Configuration for a GitHub Action input parameter.
 * Defines how users can provide data to the action.
 */
export type GitHubActionInput ={
  /** Description of what this input does */
  description?: string;
  /** Whether this input is required for the action to run */
  required?: boolean | string;
  /** Default value if not provided by the user */
  default?: string | number | boolean;
}

/**
 * Configuration for a GitHub Action output.
 * Defines data that the action makes available to subsequent steps.
 */
export type GitHubActionOutput = {
  /** Description of what this output contains */
  description?: string;
}


/**
 * Complete metadata for a GitHub Action as defined in action.yml.
 * Contains all information needed to describe and run the action.
 */
export type GitHubActionYml = {
  /** Name of the action displayed in the GitHub Marketplace */
  name?: string;
  /** Detailed description of what the action does */
  description?: string;
  /** Author or organization that created the action */
  author?: string;
  /** Branding information for the GitHub Marketplace */
  branding?: {
    /** Color theme for the action's icon */
    color?: string;
    /** Icon identifier from GitHub's icon set */
    icon?: string;
  };
  /** Input parameters that users can provide */
  inputs?: GitHubActionInputs;
  /** Output values that the action produces */
  outputs?: GitHubActionOutputs;
  /** Runtime configuration for how the action executes */
  runs?: GitHubActionRuns;
}


/**
 * Runtime configuration for a GitHub Action.
 * Defines how the action should be executed when called.
 */
export type GitHubActionRuns = {
  /** Runtime environment (docker, node12, composite, etc.) */
  using: string;
  /** Main entry point file for the action */
  main?: string;
  /** Pre-execution setup script */
  pre?: string;
  /** Post-execution cleanup script */
  post?: string;
  /** Docker image to use for containerized actions */
  image?: string;
  /** Command line arguments for the action */
  args?: string[];
  /** Steps for composite actions */
  steps?: unknown[];
  /** Environment variables for the action runtime */
  env?: EnvVars;
};


/**
 * Collection of input parameters for a GitHub Action.
 * Maps input names to their configurations.
 */
export type GitHubActionInputs = Record<string, GitHubActionInput>;

/**
 * Collection of output values for a GitHub Action.
 * Maps output names to their configurations.
 */
export type GitHubActionOutputs = Record<string, GitHubActionOutput>;

/**
 * Environment variables configuration.
 * Maps environment variable names to their string values.
 */
export type EnvVars = Record<string, string>;
