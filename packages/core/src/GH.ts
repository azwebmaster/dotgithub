
import type { GitHubInputValue } from './types';
import type { GitHubStepRun } from './types/workflow';
import { dedent } from './utils';

export type GitHubInput2<T> = { [K in keyof T]?: GitHubInputValue };

export class GH {

  static run(command: string, step?: Partial<Omit<GitHubStepRun, 'run'>>): GitHubStepRun {
    return {
      run: dedent(command).trim(),
      ...step
    };
  }
  static inputs<T>(inputs: T): GitHubInput2<T> {
    return inputs as { [K in keyof T]?: GitHubInputValue };
  }
}