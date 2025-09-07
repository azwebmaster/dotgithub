import * as yaml from 'js-yaml';
import type { GitHubWorkflow, GitHubJob, GitHubStep, GitHubEnv, GitHubPermissions, GitHubPermissionsAll } from './types/workflow';

export interface WorkflowGenerationOptions {
  indentSize?: number;
  sortKeys?: boolean;
  skipInvalid?: boolean;
}

export function generateWorkflowYaml(workflow: GitHubWorkflow, options: WorkflowGenerationOptions = {}): string {
  const yamlOptions: yaml.DumpOptions = {
    indent: options.indentSize || 2,
    sortKeys: options.sortKeys || false,
    skipInvalid: options.skipInvalid || false,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false
  };

  const processedWorkflow = processWorkflowForYaml(workflow);
  
  return yaml.dump(processedWorkflow, yamlOptions);
}

function processWorkflowForYaml(workflow: GitHubWorkflow): any {
  const processed: any = {};

  if (workflow.name) processed.name = workflow.name;
  if (workflow['run-name']) processed['run-name'] = workflow['run-name'];
  
  processed.on = processWorkflowOn(workflow.on);
  
  if (workflow.permissions) processed.permissions = processPermissions(workflow.permissions);
  if (workflow.env) processed.env = processEnv(workflow.env);
  if (workflow.defaults) processed.defaults = workflow.defaults;
  if (workflow.concurrency) processed.concurrency = workflow.concurrency;
  
  processed.jobs = processJobs(workflow.jobs);

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
  if (perms.idToken) processed['id-token'] = perms.idToken;
  if (perms.issues) processed.issues = perms.issues;
  if (perms.models) processed.models = perms.models;
  if (perms.discussions) processed.discussions = perms.discussions;
  if (perms.packages) processed.packages = perms.packages;
  if (perms.pages) processed.pages = perms.pages;
  if (perms.pullRequests) processed['pull-requests'] = perms.pullRequests;
  if (perms.securityEvents) processed['security-events'] = perms.securityEvents;
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
  const processed: any = {};
  
  if (job.name) processed.name = job.name;
  if (job.permissions) processed.permissions = processPermissions(job.permissions);
  if (job.needs) processed.needs = job.needs;
  if (job.if) processed.if = job.if;
  if (job['runs-on']) processed['runs-on'] = job['runs-on'];
  if (job.environment) processed.environment = job.environment;
  if (job.concurrency) processed.concurrency = job.concurrency;
  if (job.outputs) processed.outputs = job.outputs;
  if (job.env) processed.env = processEnv(job.env);
  if (job.defaults) processed.defaults = job.defaults;
  if (job.steps) processed.steps = processSteps(job.steps);
  if (job.strategy) processed.strategy = job.strategy;
  if (job.container) processed.container = job.container;
  if (job.services) processed.services = job.services;
  if (job.uses) processed.uses = job.uses;
  if (job.with) processed.with = job.with;
  if (job.secrets) processed.secrets = job.secrets;
  if (job.timeoutMinutes) processed['timeout-minutes'] = job.timeoutMinutes;
  if (job.continueOnError) processed['continue-on-error'] = job.continueOnError;
  
  return processed;
}

function processSteps(steps: GitHubStep<any>[]): any[] {
  return steps.map(step => processStep(step));
}

function processStep(step: GitHubStep<any>): any {
  const processed: any = {};
  
  if (step.id) processed.id = step.id;
  if (step.if) processed.if = step.if;
  if (step.name) processed.name = step.name;
  if (step.uses) processed.uses = step.uses;
  if (step.run) processed.run = step.run;
  if (step.shell) processed.shell = step.shell;
  if (step.with) processed.with = step.with;
  if (step.env) processed.env = processEnv(step.env);
  if (step['continue-on-error']) processed['continue-on-error'] = step['continue-on-error'];
  if (step['timeout-minutes']) processed['timeout-minutes'] = step['timeout-minutes'];
  if (step['working-directory']) processed['working-directory'] = step['working-directory'];
  
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