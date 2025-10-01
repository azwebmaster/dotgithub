import { Construct, GitHubStack } from './base';
import { JobConstruct } from './job';
import type { DotGithubConfig } from '../config';
import type {
  GitHubWorkflow,
  GitHubJobs
} from '../types/workflow';

export class WorkflowConstruct extends Construct {
  private readonly _workflow: GitHubWorkflow;
  private readonly _jobs: Map<string, JobConstruct> = new Map();
  private readonly _config?: DotGithubConfig;

  constructor(scope: GitHubStack, id: string, workflow: GitHubWorkflow, config?: DotGithubConfig) {
    super(scope, id);
    
    this._workflow = workflow;
    this._config = config;

    scope.addWorkflow(id, this._workflow);
  }

  addJob(id: string, jobConstruct: JobConstruct): JobConstruct {
    this._jobs.set(id, jobConstruct);
    this._workflow.jobs[id] = jobConstruct.job;
    return jobConstruct;
  }

  createJob(id: string, job: GitHubWorkflow['jobs'][string] = {}): JobConstruct {
    return new JobConstruct(this, id, job, this._config);
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