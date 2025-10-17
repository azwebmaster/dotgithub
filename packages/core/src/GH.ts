
import type { GitHubStepRun } from './types/workflow.js';
import { dedent } from './utils.js';

export class GH {

  static run(name: string, command: string, step?: Partial<Omit<GitHubStepRun, 'run' | 'name'>>): GitHubStepRun {
    return {
      name,
      run: dedent(command).trim(),
      ...step
    };
  }
}