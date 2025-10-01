import { Construct } from "./base";
import { createStep } from "../actions";
import type { WorkflowConstruct } from "./workflow";
import type { DotGithubConfig } from "../config";
import type {
  GitHubJob,
  GitHubSteps,
  GitHubStep,
  GitHubStepAny,
  GitHubStepWith,
  GitHubStepRun,
} from "../types/workflow";


export class JobConstruct extends Construct {
  private readonly _job: GitHubJob;
  private readonly _config?: DotGithubConfig;

  constructor(scope: WorkflowConstruct, id: string, job: GitHubJob = {}, config?: DotGithubConfig) {
    super(scope, id);

    this._job = job;
    this._config = config;
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

  get job(): GitHubJob {
    return this._job;
  }

  get steps(): GitHubSteps {
    return [...this._job.steps || []];
  }
}
