// Types for GitHub Actions workflow syntax

import type { GitHubWorkflowEvent, GitHubWorkflowEventName } from "./events";

export type GitHubEnv = { [key: string]: string };
export type GitHubJobs = { [jobId: string]: GitHubJob };
export type GitHubWorkflowInputs = { [inputId: string]: GitHubWorkflowInput };
export type GitHubWorkflowOutputs = { [outputId: string]: GitHubWorkflowOutput };
export type GitHubWorkflowSecrets = { [secretId: string]: GitHubWorkflowSecret };
export type GitHubJobOutputs = { [outputId: string]: string };
export type GitHubJobServices = { [serviceId: string]: GitHubJobService };
export type GitHubJobWith = { [key: string]: any };
export type GitHubStepWith = { [key: string]: any };

export type GitHubWorkflows = Record<string, GitHubWorkflow>;

export type GitHubWorkflow = {
  name?: string;
  "run-name"?: string;
  on: GitHubWorkflowOn;
  permissions?: GitHubPermissions | GitHubPermissionsAll;
  env?: GitHubEnv;
  defaults?: GitHubDefaults;
  concurrency?: GitHubConcurrency;
  jobs: GitHubJobs;
};

export type GitHubWorkflowOn =
  | GitHubWorkflowEventName
  | GitHubWorkflowEventName[]
  | GitHubWorkflowEvent

export type GitHubWorkflowInput = {
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  type?: "boolean" | "number" | "string" | "choice" | "environment";
  options?: string[];
};

export type GitHubWorkflowOutput = {
  description?: string;
  value: string;
};

export type GitHubWorkflowSecret = {
  description?: string;
  required?: boolean;
};

export type GitHubPermissions = {
  actions?: GitHubPermissionLevel;
  attestations?: GitHubPermissionLevel;
  checks?: GitHubPermissionLevel;
  contents?: GitHubPermissionLevel;
  deployments?: GitHubPermissionLevel;
  idToken?: GitHubPermissionLevel;
  issues?: GitHubPermissionLevel;
  models?: GitHubPermissionLevel;
  discussions?: GitHubPermissionLevel;
  packages?: GitHubPermissionLevel;
  pages?: GitHubPermissionLevel;
  pullRequests?: GitHubPermissionLevel;
  securityEvents?: GitHubPermissionLevel;
  statuses?: GitHubPermissionLevel;
};

export type GitHubPermissionsAll = "read-all" | "write-all" | {};
export type GitHubPermissionLevel = "read" | "write" | "none";

export type GitHubDefaults = {
  run?: {
    shell?: string;
    "working-directory"?: string;
  };
};

export type GitHubConcurrency = {
  group: string;
  "cancel-in-progress"?: boolean | string;
};

export type GitHubSteps = GitHubStep<any>[]

export type GitHubJob = {
  name?: string;
  permissions?: GitHubPermissions | GitHubPermissionsAll;
  needs?: string | string[];
  if?: string;
  "runs-on"?: string | string[] | GitHubJobRunsOnGroup;
  environment?: string | GitHubJobEnvironment;
  concurrency?: GitHubConcurrency;
  outputs?: GitHubJobOutputs;
  env?: GitHubEnv;
  defaults?: GitHubDefaults;
  steps?: GitHubSteps;
  strategy?: GitHubJobStrategy;
  container?: GitHubJobContainer | string;
  services?: GitHubJobServices;
  uses?: string;
  with?: GitHubJobWith;
  secrets?: { [key: string]: string } | "inherit";
  timeoutMinutes?: number;
  continueOnError?: boolean | string;
};

export type GitHubJobRunsOnGroup = {
  group: string;
  labels?: string | string[];
};

export type GitHubJobEnvironment = {
  name: string;
  url?: string;
};

export type GitHubJobStrategy = {
  matrix?: { [key: string]: any };
  include?: { [key: string]: any }[];
  exclude?: { [key: string]: any }[];
  failFast?: boolean;
  maxParallel?: number;
};

export type GitHubJobContainer = {
  image: string;
  credentials?: {
    username: string;
    password: string;
  };
  env?: GitHubEnv;
  ports?: Array<number | string>;
  volumes?: string[];
  options?: string;
};

export type GitHubJobService = {
  image: string;
  credentials?: {
    username: string;
    password: string;
  };
  env?: GitHubEnv;
  ports?: Array<number | string>;
  volumes?: string[];
  options?: string;
};

export type GitHubStep<T> = GitHubStepBase & {
  with?: T;
}

export type GitHubStepBase = {
  id?: string;
  if?: string;
  name?: string;
  uses?: string;
  run?: string;
  shell?: string;
  env?: GitHubEnv;
  "continue-on-error"?: boolean;
  "timeout-minutes"?: number;
  "working-directory"?: string;
};
