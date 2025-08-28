
export interface GitHubActionInput {
  description?: string;
  required?: boolean | string;
  default?: string | number | boolean;
}


export interface GitHubActionOutput {
  description?: string;
}


export interface GitHubActionYml {
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
