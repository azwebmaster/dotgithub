// Push event type with all possible properties
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
  workflow_call?: undefined | null;
  /** Manual workflow dispatch events */
  workflow_dispatch?: WorkflowDispatchWorkflowEvent | null;
  /** Workflow run events (completed, requested, in_progress) */
  workflow_run?: WorkflowRunWorkflowEvent | null;
};
// Types for GitHub Actions workflow events

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
