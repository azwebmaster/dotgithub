// Push event type with all possible properties
export type PushWorkflowEvent = {
  branches?: string[];
  "branches-ignore"?: string[];
  tags?: string[];
  "tags-ignore"?: string[];
  paths?: string[];
  "paths-ignore"?: string[];
};

// Union type for all event workflow event types
export type GitHubWorkflowEvent = {
  branch_protection_rule?: BranchProtectionRuleWorkflowEvent;
  check_run?: CheckRunWorkflowEvent;
  check_suite?: CheckSuiteWorkflowEvent;
  discussion?: DiscussionWorkflowEvent;
  discussion_comment?: DiscussionCommentWorkflowEvent;
  issue_comment?: IssueCommentWorkflowEvent;
  issues?: IssuesWorkflowEvent;
  label?: LabelWorkflowEvent;
  merge_group?: MergeGroupWorkflowEvent;
  milestone?: MilestoneWorkflowEvent;
  pull_request?: PullRequestWorkflowEvent;
  pull_request_review?: PullRequestReviewWorkflowEvent;
  pull_request_review_comment?: PullRequestReviewCommentWorkflowEvent;
  push?: PushWorkflowEvent;
  registry_package?: RegistryPackageWorkflowEvent;
  release?: ReleaseWorkflowEvent;
  watch?: WatchWorkflowEvent;
  workflow_run?: WorkflowRunWorkflowEvent;
  workflow_dispatch?: WorkflowDispatchWorkflowEvent;
  schedule?: ScheduleWorkflowEvent[];
};
// Types for GitHub Actions workflow events

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
export type BranchProtectionRuleActivityType = "created" | "edited" | "deleted";

export type BranchProtectionRuleWorkflowEvent = {
  types: BranchProtectionRuleActivityType[];
};

export type CheckRunActivityType = "created" | "rerequested" | "completed" | "requested_action";

export type CheckRunWorkflowEvent = {
  types: CheckRunActivityType[];
};

export type CheckSuiteActivityType = "completed";

export type CheckSuiteWorkflowEvent = {
  types: CheckSuiteActivityType[];
};

export type DiscussionActivityType = "created" | "edited" | "deleted" | "transferred" | "pinned" | "unpinned" | "labeled" | "unlabeled" | "locked" | "unlocked" | "category_changed" | "answered" | "unanswered";

export type DiscussionWorkflowEvent = {
  types: DiscussionActivityType[];
};

export type DiscussionCommentActivityType = "created" | "edited" | "deleted";

export type DiscussionCommentWorkflowEvent = {
  types: DiscussionCommentActivityType[];
};

export type IssueCommentActivityType = "created" | "edited" | "deleted";

export type IssueCommentWorkflowEvent = {
  types: IssueCommentActivityType[];
};

export type IssuesActivityType = "opened" | "edited" | "deleted" | "transferred" | "pinned" | "unpinned" | "closed" | "reopened" | "assigned" | "unassigned" | "labeled" | "unlabeled" | "locked" | "unlocked" | "milestoned" | "demilestoned" | "typed" | "untyped";

export type IssuesWorkflowEvent = {
  types: IssuesActivityType[];
};

export type LabelActivityType = "created" | "edited" | "deleted";

export type LabelWorkflowEvent = {
  types: LabelActivityType[];
};

export type MergeGroupActivityType = "checks_requested";

export type MergeGroupWorkflowEvent = {
  types: MergeGroupActivityType[];
};

export type MilestoneActivityType = "created" | "closed" | "opened" | "edited" | "deleted";

export type MilestoneWorkflowEvent = {
  types: MilestoneActivityType[];
};

export type PullRequestActivityType = "assigned" | "unassigned" | "labeled" | "unlabeled" | "opened" | "edited" | "closed" | "reopened" | "synchronize" | "converted_to_draft" | "locked" | "unlocked" | "enqueued" | "dequeued" | "milestoned" | "demilestoned" | "ready_for_review" | "review_requested" | "review_request_removed" | "auto_merge_enabled" | "auto_merge_disabled";

// Pull request event type with all possible properties
export type PullRequestWorkflowEvent = {
  types?: PullRequestActivityType[];
  branches?: string[];
  "branches-ignore"?: string[];
  paths?: string[];
  "paths-ignore"?: string[];
};

export type PullRequestReviewActivityType = "submitted" | "edited" | "dismissed";

export type PullRequestReviewWorkflowEvent = {
  types: PullRequestReviewActivityType[];
};

export type PullRequestReviewCommentActivityType = "created" | "edited" | "deleted";

export type PullRequestReviewCommentWorkflowEvent = {
  types: PullRequestReviewCommentActivityType[];
};

export type RegistryPackageActivityType = "published" | "updated";

export type RegistryPackageWorkflowEvent = {
  types: RegistryPackageActivityType[];
};

export type ReleaseActivityType = "published" | "unpublished" | "created" | "edited" | "deleted" | "prereleased" | "released";

export type ReleaseWorkflowEvent = {
  types: ReleaseActivityType[];
};

export type WatchActivityType = "started";

export type WatchWorkflowEvent = {
  types: WatchActivityType[];
};

export type WorkflowRunActivityType = "completed" | "requested" | "in_progress";

export type WorkflowRunWorkflowEvent = {
  types: WorkflowRunActivityType[];
};

export type WorkflowDispatchWorkflowEvent = {
  inputs?: { [key: string]: WorkflowDispatchInput };
};

export type WorkflowDispatchInput = {
  description?: string;
  required?: boolean;
  default?: string;
  type?: "boolean" | "choice" | "environment" | "string";
  options?: string[];
};

export type ScheduleWorkflowEvent = {
  cron: string;
};
