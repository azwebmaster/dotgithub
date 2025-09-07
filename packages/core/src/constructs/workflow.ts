import { Construct, GitHubStack } from './base';
import { JobConstruct } from './job';
import type {
  GitHubWorkflow,
  GitHubWorkflowOn,
  GitHubPermissions,
  GitHubPermissionsAll,
  GitHubEnv,
  GitHubDefaults,
  GitHubConcurrency,
  GitHubJobs
} from '../types/workflow';

export interface WorkflowProps {
  name?: string;
  runName?: string;
  on: GitHubWorkflowOn;
  permissions?: GitHubPermissions | GitHubPermissionsAll;
  env?: GitHubEnv;
  defaults?: GitHubDefaults;
  concurrency?: GitHubConcurrency;
}

export class WorkflowConstruct extends Construct {
  private readonly _workflow: GitHubWorkflow;
  private readonly _jobs: Map<string, JobConstruct> = new Map();

  constructor(scope: GitHubStack, id: string, props: WorkflowProps) {
    super(scope, id);
    
    this._workflow = {
      name: props.name,
      'run-name': props.runName,
      on: props.on,
      permissions: props.permissions,
      env: props.env,
      defaults: props.defaults,
      concurrency: props.concurrency,
      jobs: {}
    };

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