import { Construct } from "./base.js";
import { createStep } from "../actions.js";
import type { WorkflowConstruct } from "./workflow.js";
import type { DotGithubConfig } from "../config.js";
import type {
  GitHubJob,
  GitHubSteps,
  GitHubStep,
  GitHubStepAny,
  GitHubStepWith,
  GitHubStepRun,
  GitHubWorkflowInputs,
} from "../types/workflow.js";
import type { SharedWorkflowConstruct } from "./shared-workflow.js";


export class JobConstruct extends Construct {
  private readonly _id: string;
  private readonly _job: GitHubJob;

  constructor(scope: WorkflowConstruct, id: string, job: GitHubJob = {}) {
    super(scope, id);

    this._id = id;
    this._job = job;
    scope.addJob(id, this);

  }

  addStep(step: GitHubStepAny): this {
    this._job.steps = this._job.steps || [];
    this._job.steps.push(step);
    return this;
  }

  addSteps(steps: GitHubSteps): this {
    this._job.steps = this._job.steps || [];
    this._job.steps.push(...steps);
    return this;
  }

  addActionStep<T extends GitHubStepWith>(
    uses: string,
    inputs: T,
    step?: Partial<GitHubStep<T>>,
    ref?: string,
  ): this {
    const actionStep = createStep(uses, {
      with: inputs, ...step
    }, ref, undefined);
    return this.addStep(actionStep);
  }

  addRunStep(run: string, step?: Partial<GitHubStepRun>): this {
    const runStep: GitHubStepRun = {
      run,
      ...step,
    };
    return this.addStep(runStep);
  }

  get id(): string {
    return this._id;
  }

  get job(): GitHubJob {
    return this._job;
  }

  get steps(): GitHubSteps {
    return [...this._job.steps || []];
  }
}
