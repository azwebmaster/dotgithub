
import type { GitHubStepRun } from './types/workflow';
import { dedent } from './utils';

export class GH {

  static run(command: string, step?: Partial<Omit<GitHubStepRun, 'run'>>): GitHubStepRun {
    return {
      run: dedent(command).trim(),
      ...step
    };
  }
}