import type { GitHubWorkflow, GitHubWorkflows } from "./workflow";

export type DotGitHubRootResources = DotGitHubResources & { workflows: GitHubWorkflows };
export type DotGitHubResources = Record<string, DotGitHubResource>;

export type DotGitHubResource = {
  /* File content, if a file */
  content?: unknown;
  /* Child resources, if a directory */
  children?: DotGitHubResources;
}

export type DotGitHub = DotGitHubRootResources;

export type GitHubActionInput ={
  description?: string;
  required?: boolean | string;
  default?: string | number | boolean;
}


export type GitHubActionOutput = {
  description?: string;
}


export type GitHubActionYml = {
  name?: string;
  description?: string;
  author?: string;
  branding?: {
    color?: string;
    icon?: string;
  };
  inputs?: GitHubActionInputs;
  outputs?: GitHubActionOutputs;
  runs?: GitHubActionRuns;
}


export type GitHubActionRuns = {
  using: string;
  main?: string;
  pre?: string;
  post?: string;
  image?: string;
  args?: string[];
  steps?: unknown[];
  env?: EnvVars;
};


export type GitHubActionInputs = Record<string, GitHubActionInput>;
export type GitHubActionOutputs = Record<string, GitHubActionOutput>;
export type EnvVars = Record<string, string>;
