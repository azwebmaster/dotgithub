import { Construct, GitHubStack } from './base.js';
import { JobConstruct } from './job.js';
import type { DotGithubConfig } from '../config.js';
import type {
  GitHubWorkflow,
  GitHubJobs
} from '../types/workflow.js';

export class WorkflowConstruct extends Construct {
  private readonly _workflow: GitHubWorkflow;
  private readonly _jobs: Map<string, JobConstruct> = new Map();

  constructor(scope: GitHubStack, id: string, workflow: GitHubWorkflow) {
    super(scope, id);
    
    this._workflow = workflow;

    scope.addWorkflow(id, this._workflow);
  }

  addJob(id: string, jobConstruct: JobConstruct): JobConstruct {
    this._jobs.set(id, jobConstruct);
    this._workflow.jobs[id] = jobConstruct.job;
    return jobConstruct;
  }

  getJob(id: string): JobConstruct | undefined {
    return this._jobs.get(id);
  }

  get workflow(): GitHubWorkflow {
    return this._workflow;
  }

  get jobs(): GitHubJobs {
    return { ...this._workflow.jobs };
  }
}