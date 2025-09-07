import { Construct } from "./base";
import { createStep } from "../actions";
import type { WorkflowConstruct } from "./workflow";
// TODO: Import from generated files when available
// import {
//   setupNodeJsEnvironment,
//   type SetupNodeJsEnvironmentInputs,
// } from "../../../cli/src/generated/setup-node-js-environment";

// Temporary type definition
type SetupNodeJsEnvironmentInputs = {
  'node-version'?: string;
  cache?: string;
  [key: string]: any;
};
import type {
  GitHubJob,
  GitHubSteps,
  GitHubStep,
  GitHubPermissions,
  GitHubPermissionsAll,
  GitHubEnv,
  GitHubDefaults,
  GitHubConcurrency,
  GitHubJobOutputs,
  GitHubJobRunsOnGroup,
  GitHubJobEnvironment,
  GitHubJobStrategy,
  GitHubJobContainer,
  GitHubJobServices,
  GitHubJobWith,
  GitHubStepBase,
} from "../types/workflow";

export interface JobProps {
  name?: string;
  permissions?: GitHubPermissions | GitHubPermissionsAll;
  needs?: string | string[];
  if?: string;
  runsOn?: string | string[] | GitHubJobRunsOnGroup;
  environment?: string | GitHubJobEnvironment;
  concurrency?: GitHubConcurrency;
  outputs?: GitHubJobOutputs;
  env?: GitHubEnv;
  defaults?: GitHubDefaults;
  strategy?: GitHubJobStrategy;
  container?: GitHubJobContainer | string;
  services?: GitHubJobServices;
  uses?: string;
  with?: GitHubJobWith;
  secrets?: { [key: string]: string } | "inherit";
  timeoutMinutes?: number;
  continueOnError?: boolean | string;
  steps?: GitHubSteps;
}

export class JobConstruct extends Construct {
  private readonly _job: GitHubJob;
  private readonly _steps: GitHubSteps = [];

  constructor(scope: WorkflowConstruct, id: string, props: JobProps = {}) {
    super(scope, id);

    this._job = {
      name: props.name,
      permissions: props.permissions,
      needs: props.needs,
      if: props.if,
      "runs-on": props.runsOn || "ubuntu-latest",
      environment: props.environment,
      concurrency: props.concurrency,
      outputs: props.outputs,
      env: props.env,
      defaults: props.defaults,
      strategy: props.strategy,
      container: props.container,
      services: props.services,
      uses: props.uses,
      with: props.with,
      secrets: props.secrets,
      timeoutMinutes: props.timeoutMinutes,
      continueOnError: props.continueOnError,
      steps: props.steps ? [...props.steps] : this._steps,
    };

    if (props.steps) {
      this._steps.push(...props.steps);
    }
  }

  addStep<T>(step: GitHubStep<T>): this {
    this._steps.push(step);
    this._job.steps = this._steps;
    return this;
  }

  addSteps(steps: GitHubSteps): this {
    this._steps.push(...steps);
    this._job.steps = this._steps;
    return this;
  }

  addActionStep<T>(
    uses: string,
    inputs: T,
    step?: Partial<GitHubStepBase>,
    ref?: string,
  ): this {
    const actionStep = createStep(uses, {
      with: inputs, ...step
    }, ref);
    return this.addStep(actionStep);
  }

  addRunStep(run: string, step?: Partial<GitHubStep<any>>): this {
    const runStep: GitHubStep<any> = {
      run,
      ...step,
    };
    return this.addStep(runStep);
  }

  addCheckoutStep(
    inputs: { "fetch-depth"?: number; token?: string; ref?: string } = {},
  ): this {
    return this.addActionStep("actions/checkout", inputs);
  }

  addSetupNodeStep(inputs: SetupNodeJsEnvironmentInputs = {}): this {
    return this.addActionStep("actions/setup-node", inputs);
  }

  get job(): GitHubJob {
    return this._job;
  }

  get steps(): GitHubSteps {
    return [...this._steps];
  }
}
