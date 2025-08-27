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
export enum BranchProtectionRuleActivityType {
  Created = "created",
  Edited = "edited",
  Deleted = "deleted",
}

export type BranchProtectionRuleWorkflowEvent = {
  types: BranchProtectionRuleActivityType[];
};

export enum CheckRunActivityType {
  Created = "created",
  Rerequested = "rerequested",
  Completed = "completed",
  RequestedAction = "requested_action",
}

export type CheckRunWorkflowEvent = {
  types: CheckRunActivityType[];
};

export enum CheckSuiteActivityType {
  Completed = "completed",
}

export type CheckSuiteWorkflowEvent = {
  types: CheckSuiteActivityType[];
};

export enum DiscussionActivityType {
  Created = "created",
  Edited = "edited",
  Deleted = "deleted",
  Transferred = "transferred",
  Pinned = "pinned",
  Unpinned = "unpinned",
  Labeled = "labeled",
  Unlabeled = "unlabeled",
  Locked = "locked",
  Unlocked = "unlocked",
  CategoryChanged = "category_changed",
  Answered = "answered",
  Unanswered = "unanswered",
}

export type DiscussionWorkflowEvent = {
  types: DiscussionActivityType[];
};

export enum DiscussionCommentActivityType {
  Created = "created",
  Edited = "edited",
  Deleted = "deleted",
}

export type DiscussionCommentWorkflowEvent = {
  types: DiscussionCommentActivityType[];
};

export enum IssueCommentActivityType {
  Created = "created",
  Edited = "edited",
  Deleted = "deleted",
}

export type IssueCommentWorkflowEvent = {
  types: IssueCommentActivityType[];
};

export enum IssuesActivityType {
  Opened = "opened",
  Edited = "edited",
  Deleted = "deleted",
  Transferred = "transferred",
  Pinned = "pinned",
  Unpinned = "unpinned",
  Closed = "closed",
  Reopened = "reopened",
  Assigned = "assigned",
  Unassigned = "unassigned",
  Labeled = "labeled",
  Unlabeled = "unlabeled",
  Locked = "locked",
  Unlocked = "unlocked",
  Milestoned = "milestoned",
  Demilestoned = "demilestoned",
  Typed = "typed",
  Untyped = "untyped",
}

export type IssuesWorkflowEvent = {
  types: IssuesActivityType[];
};

export enum LabelActivityType {
  Created = "created",
  Edited = "edited",
  Deleted = "deleted",
}

export type LabelWorkflowEvent = {
  types: LabelActivityType[];
};

export enum MergeGroupActivityType {
  ChecksRequested = "checks_requested",
}

export type MergeGroupWorkflowEvent = {
  types: MergeGroupActivityType[];
};

export enum MilestoneActivityType {
  Created = "created",
  Closed = "closed",
  Opened = "opened",
  Edited = "edited",
  Deleted = "deleted",
}

export type MilestoneWorkflowEvent = {
  types: MilestoneActivityType[];
};

export enum PullRequestActivityType {
  Assigned = "assigned",
  Unassigned = "unassigned",
  Labeled = "labeled",
  Unlabeled = "unlabeled",
  Opened = "opened",
  Edited = "edited",
  Closed = "closed",
  Reopened = "reopened",
  Synchronize = "synchronize",
  ConvertedToDraft = "converted_to_draft",
  Locked = "locked",
  Unlocked = "unlocked",
  Enqueued = "enqueued",
  Dequeued = "dequeued",
  Milestoned = "milestoned",
  Demilestoned = "demilestoned",
  ReadyForReview = "ready_for_review",
  ReviewRequested = "review_requested",
  ReviewRequestRemoved = "review_request_removed",
  AutoMergeEnabled = "auto_merge_enabled",
  AutoMergeDisabled = "auto_merge_disabled",
}

// Pull request event type with all possible properties
export type PullRequestWorkflowEvent = {
  types?: PullRequestActivityType[];
  branches?: string[];
  "branches-ignore"?: string[];
  paths?: string[];
  "paths-ignore"?: string[];
};

export enum PullRequestReviewActivityType {
  Submitted = "submitted",
  Edited = "edited",
  Dismissed = "dismissed",
}

export type PullRequestReviewWorkflowEvent = {
  types: PullRequestReviewActivityType[];
};

export enum PullRequestReviewCommentActivityType {
  Created = "created",
  Edited = "edited",
  Deleted = "deleted",
}

export type PullRequestReviewCommentWorkflowEvent = {
  types: PullRequestReviewCommentActivityType[];
};

export enum RegistryPackageActivityType {
  Published = "published",
  Updated = "updated",
}

export type RegistryPackageWorkflowEvent = {
  types: RegistryPackageActivityType[];
};

export enum ReleaseActivityType {
  Published = "published",
  Unpublished = "unpublished",
  Created = "created",
  Edited = "edited",
  Deleted = "deleted",
  Prereleased = "prereleased",
  Released = "released",
}

export type ReleaseWorkflowEvent = {
  types: ReleaseActivityType[];
};

export enum WatchActivityType {
  Started = "started",
}

export type WatchWorkflowEvent = {
  types: WatchActivityType[];
};

export enum WorkflowRunActivityType {
  Completed = "completed",
  Requested = "requested",
  InProgress = "in_progress",
}

export type WorkflowRunWorkflowEvent = {
  types: WorkflowRunActivityType[];
};
