import type { GitHubStep } from "./types/workflow";

import type { EnvVars } from './types/common';

export const actionVersions: EnvVars = {};

export function createStep<T>(uses: string, step?: Partial<GitHubStep<T>>, ref?: string): GitHubStep<T> {
    const version = actionVersions[uses] || ref;
    const newStep: GitHubStep<T> = {
        uses: `${uses}@${version}`,
        ...step
    };
    return newStep;
}