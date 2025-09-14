import type { GitHubStep, GitHubStepWith, GitHubStepBase } from "./types/workflow";

import type { EnvVars } from './types/common';

export const actionVersions: EnvVars = {};

export function createStep<T extends GitHubStepWith>(uses: string, step?: Partial<Omit<GitHubStep<T>, "uses">>, ref?: string): GitHubStep<T> {
    const version = actionVersions[uses] || ref || 'latest';
    const newStep: GitHubStep<T> = {
        uses: `${uses}@${version}`,
        ...step
    };
    return newStep;
}