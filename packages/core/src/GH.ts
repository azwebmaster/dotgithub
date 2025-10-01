
import type { GitHubStepRun } from './types/workflow';
import { dedent } from './utils';

export class GH {

  static run(name: string, command: string, step?: Partial<Omit<GitHubStepRun, 'run' | 'name'>>): GitHubStepRun {
    return {
      name,
      run: dedent(command).trim(),
      ...step
    };
  }
}