import type { GitHubStep, GitHubStepWith, GitHubStepRun } from "./types/workflow";
import { dedent } from "./utils";

export const actionVersions: Record<string, string> = {};

export function setActionVersion(uses: string, version: string) {
    actionVersions[uses] = version;
}

export function run(script: string, step?: Partial<Omit<GitHubStepRun, "run">>): GitHubStepRun {
    const runStep: GitHubStepRun = {
        run: dedent(script).trim(),
        ...step
    };
    return runStep;
}

export function createStep<T extends GitHubStepWith>(uses: string, step?: Partial<Omit<GitHubStep<T>, "uses">>, ref?: string): GitHubStep<T> {
    const version = actionVersions[uses] || ref || 'latest';
    const newStep: GitHubStep<T> = {
        uses: `${uses}@${version}`,
        ...step
    };
    return newStep;
}