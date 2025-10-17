// Types for GitHub Actions workflow syntax

import type { GitHubInputValue } from "./common";

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
export type GitHubWorkflowInputs = Record<string, GitHubWorkflowInput>;

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
  on: { workflow_call: WorkflowCallWorkflowEvent };
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

/**
 * Configuration for push event triggers.
 * Defines which branches, tags, and file paths should trigger the workflow.
 */
export type PushWorkflowEvent = {
  /** Branches that will trigger the workflow */
  branches?: string[];
  /** Branches that will NOT trigger the workflow */
  "branches-ignore"?: string[];
  /** Tags that will trigger the workflow */
  tags?: string[];
  /** Tags that will NOT trigger the workflow */
  "tags-ignore"?: string[];
  /** File paths that will trigger the workflow */
  paths?: string[];
  /** File paths that will NOT trigger the workflow */
  "paths-ignore"?: string[];
};

// Union type for all event workflow event types
/**
 * Configuration for all possible GitHub workflow events.
 * Each property corresponds to a different event type that can trigger workflows.
 * Set to null to disable the event, or provide configuration object to enable with filters.
 */
export type GitHubWorkflowEvent = {
  /** Branch protection rule events (created, edited, deleted) */
  branch_protection_rule?: BranchProtectionRuleWorkflowEvent | null;
  /** Check run events (created, rerequested, completed, requested_action) */
  check_run?: CheckRunWorkflowEvent | null;
  /** Check suite events (completed) */
  check_suite?: CheckSuiteWorkflowEvent | null;
  /** Repository branch/tag creation events */
  create?: undefined | null;
  /** Repository branch/tag deletion events */
  delete?: undefined | null;
  /** Deployment events */
  deployment?: undefined | null;
  /** Deployment status events */
  deployment_status?: undefined | null;
  /** Discussion events (created, edited, deleted, etc.) */
  discussion?: DiscussionWorkflowEvent | null;
  /** Discussion comment events (created, edited, deleted) */
  discussion_comment?: DiscussionCommentWorkflowEvent | null;
  /** Repository fork events */
  fork?: undefined | null;
  /** Wiki page events */
  gollum?: undefined | null;
  /** Issue comment events (created, edited, deleted) */
  issue_comment?: IssueCommentWorkflowEvent | null;
  /** Issue events (opened, edited, closed, etc.) */
  issues?: IssuesWorkflowEvent | null;
  /** Label events (created, edited, deleted) */
  label?: LabelWorkflowEvent | null;
  /** Merge group events (checks_requested) */
  merge_group?: MergeGroupWorkflowEvent | null;
  /** Milestone events (created, closed, opened, etc.) */
  milestone?: MilestoneWorkflowEvent | null;
  /** GitHub Pages build events */
  page_build?: undefined | null;
  /** Repository made public events */
  public?: undefined | null;
  /** Pull request events (opened, closed, synchronized, etc.) */
  pull_request?: PullRequestWorkflowEvent | null;
  /** Pull request review events (submitted, edited, dismissed) */
  pull_request_review?: PullRequestReviewWorkflowEvent | null;
  /** Pull request review comment events (created, edited, deleted) */
  pull_request_review_comment?: PullRequestReviewCommentWorkflowEvent | null;
  /** Pull request target events (same as pull_request but runs in base branch context) */
  pull_request_target?: PullRequestWorkflowEvent | null;
  /** Push events with branch/tag/path filters */
  push?: PushWorkflowEvent | null;
  /** Package registry events (published, updated) */
  registry_package?: RegistryPackageWorkflowEvent | null;
  /** Release events (published, created, edited, etc.) */
  release?: ReleaseWorkflowEvent | null;
  /** Repository dispatch events (custom events) */
  repository_dispatch?: RepositoryDispatchWorkflowEvent | null;
  /** Scheduled events using cron syntax */
  schedule?: ScheduleWorkflowEvent[] | null;
  /** Commit status events */
  status?: undefined | null;
  /** Repository watch/star events (started) */
  watch?: WatchWorkflowEvent | null;
  /** Manual workflow call events */
  workflow_call?: WorkflowCallWorkflowEvent | null;
  /** Manual workflow dispatch events */
  workflow_dispatch?: WorkflowDispatchWorkflowEvent | null;
  /** Workflow run events (completed, requested, in_progress) */
  workflow_run?: WorkflowRunWorkflowEvent | null;
};
// Types for GitHub Actions workflow events

export type WorkflowCallWorkflowEvent = {
  /** Inputs that can be passed to the workflow. */
  inputs?: GitHubWorkflowInputs | null;
};

/**
 * String literal union of all supported GitHub workflow event names.
 * These correspond to the events that can trigger GitHub Actions workflows.
 */
export type GitHubWorkflowEventName =
  | "branch_protection_rule"
  | "check_run"
  | "check_suite"
  | "create"
  | "delete"
  | "deployment"
  | "deployment_status"
  | "discussion"
  | "discussion_comment"
  | "fork"
  | "gollum"
  | "issue_comment"
  | "issues"
  | "label"
  | "merge_group"
  | "milestone"
  | "page_build"
  | "public"
  | "pull_request"
  | "pull_request_review"
  | "pull_request_review_comment"
  | "pull_request_target"
  | "push"
  | "registry_package"
  | "release"
  | "repository_dispatch"
  | "schedule"
  | "status"
  | "watch"
  | "workflow_call"
  | "workflow_dispatch"
  | "workflow_run";

// Add event-specific types here as needed

/**
 * Activity types for branch protection rule events.
 * Defines what actions on branch protection rules will trigger the workflow.
 */
export type BranchProtectionRuleActivityType = "created" | "edited" | "deleted";

/**
 * Configuration for branch protection rule event triggers.
 * Specifies which branch protection rule activities should trigger the workflow.
 */
export type BranchProtectionRuleWorkflowEvent = {
  /** Types of branch protection rule activities to listen for */
  types: BranchProtectionRuleActivityType[];
};

/**
 * Activity types for check run events.
 * Defines what actions on check runs will trigger the workflow.
 */
export type CheckRunActivityType = "created" | "rerequested" | "completed" | "requested_action";

/**
 * Configuration for check run event triggers.
 * Specifies which check run activities should trigger the workflow.
 */
export type CheckRunWorkflowEvent = {
  /** Types of check run activities to listen for */
  types: CheckRunActivityType[];
};

/**
 * Activity types for check suite events.
 * Currently only supports "completed" events.
 */
export type CheckSuiteActivityType = "completed";

/**
 * Configuration for check suite event triggers.
 * Specifies which check suite activities should trigger the workflow.
 */
export type CheckSuiteWorkflowEvent = {
  /** Types of check suite activities to listen for */
  types: CheckSuiteActivityType[];
};

/**
 * Activity types for discussion events.
 * Defines what actions on discussions will trigger the workflow.
 */
export type DiscussionActivityType = "created" | "edited" | "deleted" | "transferred" | "pinned" | "unpinned" | "labeled" | "unlabeled" | "locked" | "unlocked" | "category_changed" | "answered" | "unanswered";

/**
 * Configuration for discussion event triggers.
 * Specifies which discussion activities should trigger the workflow.
 */
export type DiscussionWorkflowEvent = {
  /** Types of discussion activities to listen for */
  types: DiscussionActivityType[];
};

/**
 * Activity types for discussion comment events.
 * Defines what actions on discussion comments will trigger the workflow.
 */
export type DiscussionCommentActivityType = "created" | "edited" | "deleted";

/**
 * Configuration for discussion comment event triggers.
 * Specifies which discussion comment activities should trigger the workflow.
 */
export type DiscussionCommentWorkflowEvent = {
  /** Types of discussion comment activities to listen for */
  types: DiscussionCommentActivityType[];
};

/**
 * Activity types for issue comment events.
 * Defines what actions on issue comments will trigger the workflow.
 */
export type IssueCommentActivityType = "created" | "edited" | "deleted";

/**
 * Configuration for issue comment event triggers.
 * Specifies which issue comment activities should trigger the workflow.
 */
export type IssueCommentWorkflowEvent = {
  /** Types of issue comment activities to listen for */
  types: IssueCommentActivityType[];
};

/**
 * Activity types for issue events.
 * Defines what actions on issues will trigger the workflow.
 */
export type IssuesActivityType = "opened" | "edited" | "deleted" | "transferred" | "pinned" | "unpinned" | "closed" | "reopened" | "assigned" | "unassigned" | "labeled" | "unlabeled" | "locked" | "unlocked" | "milestoned" | "demilestoned" | "typed" | "untyped";

/**
 * Configuration for issue event triggers.
 * Specifies which issue activities should trigger the workflow.
 */
export type IssuesWorkflowEvent = {
  /** Types of issue activities to listen for */
  types: IssuesActivityType[];
};

/**
 * Activity types for label events.
 * Defines what actions on labels will trigger the workflow.
 */
export type LabelActivityType = "created" | "edited" | "deleted";

/**
 * Configuration for label event triggers.
 * Specifies which label activities should trigger the workflow.
 */
export type LabelWorkflowEvent = {
  /** Types of label activities to listen for */
  types: LabelActivityType[];
};

/**
 * Activity types for merge group events.
 * Currently only supports "checks_requested" events.
 */
export type MergeGroupActivityType = "checks_requested";

/**
 * Configuration for merge group event triggers.
 * Specifies which merge group activities should trigger the workflow.
 */
export type MergeGroupWorkflowEvent = {
  /** Types of merge group activities to listen for */
  types: MergeGroupActivityType[];
};

/**
 * Activity types for milestone events.
 * Defines what actions on milestones will trigger the workflow.
 */
export type MilestoneActivityType = "created" | "closed" | "opened" | "edited" | "deleted";

/**
 * Configuration for milestone event triggers.
 * Specifies which milestone activities should trigger the workflow.
 */
export type MilestoneWorkflowEvent = {
  /** Types of milestone activities to listen for */
  types: MilestoneActivityType[];
};

/**
 * Activity types for pull request events.
 * Defines what actions on pull requests will trigger the workflow.
 */
export type PullRequestActivityType = "assigned" | "unassigned" | "labeled" | "unlabeled" | "opened" | "edited" | "closed" | "reopened" | "synchronize" | "converted_to_draft" | "locked" | "unlocked" | "enqueued" | "dequeued" | "milestoned" | "demilestoned" | "ready_for_review" | "review_requested" | "review_request_removed" | "auto_merge_enabled" | "auto_merge_disabled";

// Pull request event type with all possible properties
/**
 * Configuration for pull request event triggers.
 * Defines which pull request activities and filters should trigger the workflow.
 */
export type PullRequestWorkflowEvent = {
  /** Types of pull request activities to listen for */
  types?: PullRequestActivityType[];
  /** Branches that will trigger the workflow */
  branches?: string[];
  /** Branches that will NOT trigger the workflow */
  "branches-ignore"?: string[];
  /** File paths that will trigger the workflow */
  paths?: string[];
  /** File paths that will NOT trigger the workflow */
  "paths-ignore"?: string[];
};

/**
 * Activity types for pull request review events.
 * Defines what actions on pull request reviews will trigger the workflow.
 */
export type PullRequestReviewActivityType = "submitted" | "edited" | "dismissed";

/**
 * Configuration for pull request review event triggers.
 * Specifies which pull request review activities should trigger the workflow.
 */
export type PullRequestReviewWorkflowEvent = {
  /** Types of pull request review activities to listen for */
  types: PullRequestReviewActivityType[];
};

/**
 * Activity types for pull request review comment events.
 * Defines what actions on pull request review comments will trigger the workflow.
 */
export type PullRequestReviewCommentActivityType = "created" | "edited" | "deleted";

/**
 * Configuration for pull request review comment event triggers.
 * Specifies which pull request review comment activities should trigger the workflow.
 */
export type PullRequestReviewCommentWorkflowEvent = {
  /** Types of pull request review comment activities to listen for */
  types: PullRequestReviewCommentActivityType[];
};

/**
 * Activity types for registry package events.
 * Defines what actions on packages will trigger the workflow.
 */
export type RegistryPackageActivityType = "published" | "updated";

/**
 * Configuration for registry package event triggers.
 * Specifies which package activities should trigger the workflow.
 */
export type RegistryPackageWorkflowEvent = {
  /** Types of package activities to listen for */
  types: RegistryPackageActivityType[];
};

/**
 * Activity types for release events.
 * Defines what actions on releases will trigger the workflow.
 */
export type ReleaseActivityType = "published" | "unpublished" | "created" | "edited" | "deleted" | "prereleased" | "released";

/**
 * Configuration for release event triggers.
 * Specifies which release activities should trigger the workflow.
 */
export type ReleaseWorkflowEvent = {
  /** Types of release activities to listen for */
  types: ReleaseActivityType[];
};

/**
 * Activity types for watch events.
 * Currently only supports "started" (when someone stars the repository).
 */
export type WatchActivityType = "started";

/**
 * Configuration for watch event triggers.
 * Specifies which watch activities should trigger the workflow.
 */
export type WatchWorkflowEvent = {
  /** Types of watch activities to listen for */
  types: WatchActivityType[];
};

/**
 * Activity types for workflow run events.
 * Defines what workflow run states will trigger the workflow.
 */
export type WorkflowRunActivityType = "completed" | "requested" | "in_progress";

/**
 * Configuration for workflow run event triggers.
 * Specifies which workflow run activities and filters should trigger the workflow.
 */
export type WorkflowRunWorkflowEvent = {
  /** Names of workflows to monitor */
  workflows: string[];
  /** Types of workflow run activities to listen for */
  types?: WorkflowRunActivityType[];
  /** Branches that will trigger the workflow */
  branches?: string[];
  /** Branches that will NOT trigger the workflow */
  "branches-ignore"?: string[];
};

/**
 * Configuration for workflow dispatch event triggers.
 * Allows manual triggering of workflows with custom inputs.
 */
export type WorkflowDispatchWorkflowEvent = {
  /** Input parameters that can be provided when manually triggering the workflow */
  inputs?: { [key: string]: WorkflowDispatchInput };
};

/**
 * Configuration for a workflow dispatch input parameter.
 * Defines how users can provide data when manually triggering workflows.
 */
export type WorkflowDispatchInput = {
  /** Description of the input parameter */
  description?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Default value if not provided */
  default?: string;
  /** Type of the input parameter */
  type?: "boolean" | "choice" | "environment" | "string";
  /** Available options when type is "choice" */
  options?: string[];
};

/**
 * Configuration for scheduled workflow triggers.
 * Uses cron syntax to define when the workflow should run automatically.
 */
export type ScheduleWorkflowEvent = {
  /** Cron expression defining when the workflow should run */
  cron: string;
};

/**
 * Configuration for repository dispatch event triggers.
 * Allows triggering workflows via custom events sent to the repository.
 */
export type RepositoryDispatchWorkflowEvent = {
  /** Types of custom events to listen for */
  types?: string[];
  /** Event type identifier for the custom event */
  event_type?: string;
  /** Additional data payload for the custom event */
  client_payload?: { [key: string]: any };
};
