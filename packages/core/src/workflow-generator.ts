import * as yaml from 'yaml';
import type { GitHubWorkflow, GitHubJob, GitHubStep, GitHubEnv, GitHubPermissions, GitHubPermissionsAll, GitHubStepAny } from './types/workflow.js';

export interface WorkflowGenerationOptions {
  indentSize?: number;
  sortKeys?: boolean;
  skipInvalid?: boolean;
}

export function generateWorkflowYaml(workflow: GitHubWorkflow, options: WorkflowGenerationOptions = {}): string {
  const yamlOptions: yaml.ToStringOptions = {
    indent: options.indentSize || 2,
    lineWidth: 0,
    minContentWidth: 0,
    simpleKeys: false,
    doubleQuotedAsJSON: false,
    doubleQuotedMinMultiLineLength: 40
  };

  const processedWorkflow = processWorkflowForYaml(workflow);

  return yaml.stringify(processedWorkflow, yamlOptions);
}


function processWorkflowForYaml(workflow: GitHubWorkflow): any {
  // Create ordered workflow object to control YAML property order
  const processed: any = {};
  
  // Define the desired order for workflow properties
  const workflowOrder = [
    'name',
    'run-name', 
    'on',
    'permissions',
    'env',
    'defaults',
    'concurrency',
    'jobs'
  ];
  
  // Add properties in the specified order
  for (const key of workflowOrder) {
    if (workflow[key as keyof GitHubWorkflow] !== undefined) {
      if (key === 'on') {
        processed.on = processWorkflowOn(workflow.on);
      } else if (key === 'permissions' && workflow.permissions) {
        processed.permissions = processPermissions(workflow.permissions);
      } else if (key === 'env' && workflow.env) {
        processed.env = processEnv(workflow.env);
      } else if (key === 'jobs') {
        processed.jobs = processJobs(workflow.jobs);
      } else {
        processed[key] = workflow[key as keyof GitHubWorkflow];
      }
    }
  }

  return processed;
}

function processWorkflowOn(on: any): any {
  if (typeof on === 'string') return on;
  if (Array.isArray(on)) return on;

  const processed: any = {};
  for (const [event, config] of Object.entries(on)) {
    if (config === null || config === undefined) {
      processed[event] = null;
    } else {
      processed[event] = config;
    }
  }
  return processed;
}

function processPermissions(permissions: GitHubPermissions | GitHubPermissionsAll): any {
  if (typeof permissions === 'string' || typeof permissions === 'object' && Object.keys(permissions).length === 0) {
    return permissions;
  }

  const processed: any = {};
  const perms = permissions as GitHubPermissions;

  if (perms.actions) processed.actions = perms.actions;
  if (perms.attestations) processed.attestations = perms.attestations;
  if (perms.checks) processed.checks = perms.checks;
  if (perms.contents) processed.contents = perms.contents;
  if (perms.deployments) processed.deployments = perms.deployments;
  if (perms['id-token']) processed['id-token'] = perms['id-token'];
  if (perms.issues) processed.issues = perms.issues;
  if (perms.models) processed.models = perms.models;
  if (perms.discussions) processed.discussions = perms.discussions;
  if (perms.packages) processed.packages = perms.packages;
  if (perms.pages) processed.pages = perms.pages;
  if (perms['pull-requests']) processed['pull-requests'] = perms['pull-requests'];
  if (perms['security-events']) processed['security-events'] = perms['security-events'];
  if (perms.statuses) processed.statuses = perms.statuses;

  return processed;
}

function processEnv(env: GitHubEnv): any {
  const processed: any = {};
  for (const [key, value] of Object.entries(env)) {
    processed[key] = value;
  }
  return processed;
}

function processJobs(jobs: { [jobId: string]: GitHubJob }): any {
  const processed: any = {};

  for (const [jobId, job] of Object.entries(jobs)) {
    processed[jobId] = processJob(job);
  }

  return processed;
}

function processJob(job: GitHubJob): any {
  // Define the desired order for job properties
  const jobOrder = [
    'name',
    'permissions',
    'needs',
    'if',
    'runs-on',
    'environment',
    'concurrency',
    'outputs',
    'env',
    'defaults',
    'steps',
    'strategy',
    'container',
    'services',
    'uses',
    'with',
    'secrets',
    'timeout-minutes',
    'continue-on-error'
  ];
  
  const processed: any = {};
  
  // Add properties in the specified order
  for (const key of jobOrder) {
    if (job[key as keyof GitHubJob] !== undefined) {
      if (key === 'permissions' && job.permissions) {
        processed.permissions = processPermissions(job.permissions);
      } else if (key === 'env' && job.env) {
        processed.env = processEnv(job.env);
      } else if (key === 'steps' && job.steps) {
        processed.steps = processSteps(job.steps);
      } else if (key === 'timeout-minutes' && job['timeout-minutes']) {
        processed['timeout-minutes'] = job['timeout-minutes'];
      } else if (key === 'continue-on-error' && job['continue-on-error']) {
        processed['continue-on-error'] = job['continue-on-error'];
      } else {
        processed[key] = job[key as keyof GitHubJob];
      }
    }
  }

  return processed;
}

function processSteps(steps: GitHubStepAny[]): any[] {
  return steps.map(step => processStep(step));
}

function processStep(step: GitHubStepAny): any {
  // Define the desired order for step properties
  const stepOrder = [
    'id',
    'if',
    'name',
    'uses',
    'run',
    'shell',
    'with',
    'env',
    'continue-on-error',
    'timeout-minutes',
    'working-directory'
  ];
  
  const processed: any = {};
  
  // Add properties in the specified order
  for (const key of stepOrder) {
    if (step[key as keyof GitHubStepAny] !== undefined) {
      if (key === 'env' && step.env) {
        processed.env = processEnv(step.env);
      } else {
        processed[key] = step[key as keyof GitHubStepAny];
      }
    }
  }

  return processed;
}

export function createWorkflow(config: Partial<GitHubWorkflow>): GitHubWorkflow {
  if (!config.on) {
    throw new Error('Workflow must specify "on" triggers');
  }

  if (!config.jobs) {
    throw new Error('Workflow must specify "jobs"');
  }

  return {
    on: config.on,
    jobs: config.jobs,
    ...config
  };
}

export function createJob(config: Partial<GitHubJob>): GitHubJob {
  return {
    ...config
  };
}