// Types for GitHub Actions workflow syntax

import type { GitHubInputValue } from "./common";
import type { GitHubWorkflowEvent, GitHubWorkflowEventName } from "./events";

/**
 * Environment variables configuration for workflows, jobs, or steps.
 * Variables are set as environment variables in the runner environment.
 */
export type GitHubEnv = { [key: string]: string };

/**
 * Collection of jobs that make up a workflow.
 * Each job runs in parallel by default unless dependencies are specified.
 */
export type GitHubJobs = { [jobId: string]: GitHubJob };

/**
 * Collection of inputs defined for a reusable workflow.
 * Inputs allow callers to pass data to the workflow.
 */
export type GitHubWorkflowInputs = { [inputId: string]: GitHubWorkflowInput };

/**
 * Collection of outputs defined for a reusable workflow.
 * Outputs allow the workflow to return data to the caller.
 */
export type GitHubWorkflowOutputs = { [outputId: string]: GitHubWorkflowOutput };

/**
 * Collection of secrets defined for a reusable workflow.
 * Secrets allow callers to pass sensitive data to the workflow.
 */
export type GitHubWorkflowSecrets = { [secretId: string]: GitHubWorkflowSecret };

/**
 * Collection of outputs from a job.
 * Job outputs can be used by dependent jobs or as workflow outputs.
 */
export type GitHubJobOutputs = { [outputId: string]: string };

/**
 * Collection of service containers for a job.
 * Services provide databases or cache services like Redis for job execution.
 */
export type GitHubJobServices = { [serviceId: string]: GitHubJobService };

/**
 * Input parameters for a reusable workflow job.
 * Maps input parameter names to their values.
 */
export type GitHubJobWith = { [key: string]: any };

/**
 * Input parameters for a workflow step.
 * Maps parameter names to their values for actions or containers.
 */
export type GitHubStepWith = { [key: string]: GitHubInputValue };

/**
 * Collection of workflow files.
 * Maps workflow names to their configurations.
 */
export type GitHubWorkflows = Record<string, GitHubWorkflow>;

/**
 * Configuration for a GitHub Actions workflow.
 * A workflow is a configurable automated process made up of one or more jobs.
 */
export type GitHubWorkflow = {
  /** The name of the workflow. Displayed in GitHub's UI. */
  name?: string;
  /** The name for workflow runs generated from the workflow. */
  "run-name"?: string;
  /** Events that trigger the workflow. */
  on: GitHubWorkflowOn;
  /** Permissions granted to the GITHUB_TOKEN for all jobs in the workflow. */
  permissions?: GitHubPermissions | GitHubPermissionsAll;
  /** Environment variables available to all jobs in the workflow. */
  env?: GitHubEnv;
  /** Default settings that will apply to all jobs in the workflow. */
  defaults?: GitHubDefaults;
  /** Concurrency controls to prevent multiple workflow runs from running simultaneously. */
  concurrency?: GitHubConcurrency;
  /** Jobs that make up the workflow. */
  jobs: GitHubJobs;
};

/**
 * Configuration for a GitHub Actions reusable workflow.
 * A reusable workflow can be called from other workflows and accepts inputs.
 */
export type GitHubReusableWorkflow = {
  /** The name of the workflow. Displayed in GitHub's UI. */
  name?: string;
  /** The name for workflow runs generated from the workflow. */
  "run-name"?: string;
  /** Events that trigger the workflow. */
  on: GitHubWorkflowOn;
  /** Permissions granted to the GITHUB_TOKEN for all jobs in the workflow. */
  permissions?: GitHubPermissions | GitHubPermissionsAll;
  /** Environment variables available to all jobs in the workflow. */
  env?: GitHubEnv;
  /** Default settings that will apply to all jobs in the workflow. */
  defaults?: GitHubDefaults;
  /** Concurrency controls to prevent multiple workflow runs from running simultaneously. */
  concurrency?: GitHubConcurrency;
  /** Jobs that make up the workflow. */
  jobs: GitHubJobs;
  /** Input parameters that can be passed to the reusable workflow. */
  inputs?: GitHubWorkflowInputs;
  /** Outputs that the reusable workflow can return to the caller. */
  outputs?: GitHubWorkflowOutputs;
  /** Secrets that can be passed to the reusable workflow. */
  secrets?: GitHubWorkflowSecrets;
};

/**
 * Events that can trigger a workflow.
 * Can be a single event name, array of event names, or detailed event configuration.
 */
export type GitHubWorkflowOn =
  | GitHubWorkflowEventName
  | GitHubWorkflowEventName[]
  | GitHubWorkflowEvent

/**
 * Configuration for a workflow input parameter.
 * Defines how callers can pass data to a reusable workflow.
 */
export type GitHubWorkflowInput = {
  /** Description of the input parameter. */
  description?: string;
  /** Whether the input is required. Defaults to false. */
  required?: boolean;
  /** Default value if not provided by the caller. */
  default?: string | number | boolean;
  /** Type of the input parameter. */
  type?: "boolean" | "number" | "string" | "choice" | "environment";
  /** Available options when type is "choice". */
  options?: string[];
};

/**
 * Configuration for a workflow output.
 * Defines data that the workflow returns to the caller.
 */
export type GitHubWorkflowOutput = {
  /** Description of the output. */
  description?: string;
  /** Expression that evaluates to the output value. */
  value: string;
};

/**
 * Configuration for a workflow secret.
 * Defines sensitive data that callers can pass to a reusable workflow.
 */
export type GitHubWorkflowSecret = {
  /** Description of the secret. */
  description?: string;
  /** Whether the secret is required. Defaults to false. */
  required?: boolean;
};

/**
 * Permissions configuration for the GITHUB_TOKEN.
 * Controls what actions the token can perform on GitHub.
 * Each permission can be set to "read", "write", or "none".
 */
export type GitHubPermissions = {
  /** Work with GitHub Actions (cancel workflows, etc.) */
  actions?: GitHubPermissionLevel;
  /** Work with artifact attestations */
  attestations?: GitHubPermissionLevel;
  /** Work with check runs and check suites */
  checks?: GitHubPermissionLevel;
  /** Work with repository contents (read/write code, etc.) */
  contents?: GitHubPermissionLevel;
  /** Work with deployments */
  deployments?: GitHubPermissionLevel;
  /** Fetch an OpenID Connect (OIDC) token */
  "id-token"?: GitHubPermissionLevelIdToken;
  /** Work with issues */
  issues?: GitHubPermissionLevel;
  /** Generate AI inference responses with GitHub Models */
  models?: GitHubPermissionLevelModels;
  /** Work with GitHub Discussions */
  discussions?: GitHubPermissionLevel;
  /** Work with GitHub Packages */
  packages?: GitHubPermissionLevel;
  /** Work with GitHub Pages */
  pages?: GitHubPermissionLevel;
  /** Work with pull requests */
  "pull-requests"?: GitHubPermissionLevel;
  /** Work with GitHub code scanning and secret scanning alerts */
  "security-events"?: GitHubPermissionLevel;
  /** Work with commit statuses */
  statuses?: GitHubPermissionLevel;
};

/**
 * Shorthand permissions configuration.
 * "read-all" grants read access to all permissions.
 * "write-all" grants write access to all permissions.
 * Empty object {} sets all permissions to "none".
 */
export type GitHubPermissionsAll = "read-all" | "write-all" | {};

/**
 * Standard permission levels for most GitHub permissions.
 * "write" includes "read" permissions.
 */
export type GitHubPermissionLevel = "read" | "write" | "none";

/**
 * Permission levels for ID token generation.
 * Only "write" and "none" are valid for OIDC token fetching.
 */
export type GitHubPermissionLevelIdToken = "write" | "none";

/**
 * Permission levels for GitHub Models.
 * Only "read" and "none" are valid for AI model inference.
 */
export type GitHubPermissionLevelModels = "read" | "none";

/**
 * Default settings that apply to all jobs in the workflow.
 * Can be overridden by job-specific settings.
 */
export type GitHubDefaults = {
  /** Default settings for run steps in all jobs. */
  run?: {
    /** Default shell for run steps. */
    shell?: string;
    /** Default working directory for run steps. */
    "working-directory"?: string;
  };
};

/**
 * Concurrency controls to prevent multiple workflow runs from running simultaneously.
 * Useful for preventing conflicts in deployment scenarios.
 */
export type GitHubConcurrency = string | {
  /** Identifier for the concurrency group. */
  group: string;
  /** Whether to cancel in-progress runs when a new run starts. */
  "cancel-in-progress"?: boolean | string;
};

/**
 * Collection of steps that make up a job.
 * Steps run sequentially in the order they are defined.
 */
export type GitHubSteps = GitHubStepAny[];

/**
 * Configuration for a job in a workflow.
 * Jobs run in parallel by default unless dependencies are specified.
 */
export type GitHubJob = {
  /** Name of the job displayed in GitHub's UI. */
  name?: string;
  /** Permissions granted to the GITHUB_TOKEN for this job. */
  permissions?: GitHubPermissions | GitHubPermissionsAll;
  /** Jobs that must complete successfully before this job runs. */
  needs?: string | string[];
  /** Condition that must be met for the job to run. */
  if?: string;
  /** Type of machine to run the job on. */
  "runs-on"?: string | string[] | GitHubJobRunsOnGroup;
  /** Environment that the job references. */
  environment?: string | GitHubJobEnvironment;
  /** Concurrency controls for this job. */
  concurrency?: GitHubConcurrency;
  /** Outputs that can be used by dependent jobs. */
  outputs?: GitHubJobOutputs;
  /** Environment variables available to all steps in the job. */
  env?: GitHubEnv;
  /** Default settings for all steps in the job. */
  defaults?: GitHubDefaults;
  /** Steps that make up the job. */
  steps?: GitHubSteps;
  /** Strategy for running multiple job variations. */
  strategy?: GitHubJobStrategy;
  /** Container to run the job in. */
  container?: GitHubJobContainer | string;
  /** Service containers for the job. */
  services?: GitHubJobServices;
  /** Reusable workflow to run as a job. */
  uses?: string;
  /** Inputs for the reusable workflow. */
  with?: GitHubJobWith;
  /** Secrets available to the reusable workflow. */
  secrets?: { [key: string]: string } | "inherit";
  /** Maximum time in minutes for the job to run. */
  "timeout-minutes"?: number;
  /** Whether to continue running the workflow if this job fails. */
  "continue-on-error"?: boolean | string;
};

/**
 * Configuration for running a job on a specific runner group.
 * Allows targeting runners based on group membership and labels.
 */
export type GitHubJobRunsOnGroup = {
  /** Name of the runner group. */
  group: string;
  /** Labels that the runner must have. */
  labels?: string | string[];
};

/**
 * Environment configuration for a job.
 * References a deployment environment defined in the repository.
 */
export type GitHubJobEnvironment = {
  /** Name of the environment. */
  name: string;
  /** URL to display on the deployment. */
  url?: string;
};

/**
 * Strategy configuration for running multiple variations of a job.
 * Useful for testing across multiple versions or configurations.
 */
export type GitHubJobStrategy = {
  /** Matrix of values to test against. */
  matrix?: { [key: string]: any };
  /** Additional configurations to include in the matrix. */
  include?: { [key: string]: any }[];
  /** Configurations to exclude from the matrix. */
  exclude?: { [key: string]: any }[];
  /** Whether to fail the entire matrix if one job fails. */
  failFast?: boolean;
  /** Maximum number of jobs to run in parallel. */
  maxParallel?: number;
};

/**
 * Container configuration for running a job in a Docker container.
 * All steps in the job will run inside this container.
 */
export type GitHubJobContainer = {
  /** Docker image to use for the container. */
  image: string;
  /** Credentials for accessing private container registries. */
  credentials?: {
    /** Username for registry authentication. */
    username: string;
    /** Password for registry authentication. */
    password: string;
  };
  /** Environment variables for the container. */
  env?: GitHubEnv;
  /** Ports to expose from the container. */
  ports?: Array<number | string>;
  /** Volumes to mount in the container. */
  volumes?: string[];
  /** Additional Docker options for the container. */
  options?: string;
};

/**
 * Service container configuration for a job.
 * Provides supporting services like databases for job execution.
 */
export type GitHubJobService = {
  /** Docker image to use for the service container. */
  image: string;
  /** Credentials for accessing private container registries. */
  credentials?: {
    /** Username for registry authentication. */
    username: string;
    /** Password for registry authentication. */
    password: string;
  };
  /** Environment variables for the service container. */
  env?: GitHubEnv;
  /** Ports to expose from the service container. */
  ports?: Array<number | string>;
  /** Volumes to mount in the service container. */
  volumes?: string[];
  /** Additional Docker options for the service container. */
  options?: string;
};

/**
 * Configuration for a step that runs a GitHub Action.
 * Actions are reusable units of code that perform specific tasks.
 */
export type GitHubStep<T extends GitHubStepWith> = GitHubStepBase & {
  /** Reference to the action to run. */
  uses: string;
  /** Input parameters for the action. */
  with?: T;
  /** Not allowed when using an action. */
  run?: never;
}

export type GitHubStepAction = GitHubStep<GitHubStepWith>;

/**
 * Configuration for a step that runs shell commands.
 * Executes command-line programs using the operating system's shell.
 */
export type GitHubStepRun = GitHubStepBase & {
  /** Command-line programs to execute. */
  run: string;
  /** Shell to use for running the command. */
  shell?: string;
  /** Working directory for the command. */
  "working-directory"?: string;
  /** Not allowed when running commands. */
  uses?: never;
  /** Not allowed when running commands. */
  with?: never;
}

/**
 * Union type for any type of workflow step.
 * Can be either an action step or a run step.
 */
export type GitHubStepAny = GitHubStep<GitHubStepWith> | GitHubStepRun;

/**
 * Base configuration shared by all workflow steps.
 * Contains common properties that apply to both action and run steps.
 */
export type GitHubStepBase = {
  /** Unique identifier for the step. */
  id?: string;
  /** Condition that must be met for the step to run. */
  if?: string;
  /** Name of the step displayed in GitHub's UI. */
  name?: string;
  /** Environment variables for the step. */
  env?: GitHubEnv;
  /** Whether to continue the job if this step fails. */
  "continue-on-error"?: boolean;
  /** Maximum time in minutes for the step to run. */
  "timeout-minutes"?: number;
};
