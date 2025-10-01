import type { GitHubStep, GitHubStepWith, GitHubStepRun } from "./types/workflow";
import type { DotGithubConfig, DotGithubAction } from "./config";
import { dedent } from "./utils";
import type { PluginContext } from "./plugins/types";

export function run(name: string, script: string, step?: Partial<Omit<GitHubStepRun, "run" | "name">>): GitHubStepRun {
    const runStep: GitHubStepRun = {
        name,
        run: dedent(script).trim(),
        ...step
    };
    return runStep;
}

/**
 * Creates a GitHub Action step with version resolution from config
 * @param uses - The action to use (e.g., "actions/checkout")
 * @param step - Additional step configuration
 * @param ref - Optional ref override
 * @param context - Optional plugin context to look up action ref overrides
 * @returns A GitHub step configuration
 */
export function createStep<T extends GitHubStepWith>(
    uses: string, 
    step?: Partial<Omit<GitHubStep<T>, "uses">>, 
    ref?: string,
    context?: PluginContext,
    fallbackRef?: string
): GitHubStep<T> {
    let version: string | undefined;
    
    // Priority order: 1. Stack config (highest), 2. Plugin config, 3. Action function ref, 4. Hardcoded ref
    if (context) {
        // Check for action overrides in the merged config (stack config takes priority over plugin config)
        const actionOverride = context.config.actions?.[uses];
        if (actionOverride) {
            version = actionOverride;
        }
    }
    
    // If no config override found, use explicit ref parameter (action function ref)
    if (!version && ref) {
        version = ref;
    }
    
    // Fallback to provided fallback ref (hardcoded ref), then 'latest' if no version found
    version = version || fallbackRef || 'latest';
    
    const newStep: GitHubStep<T> = {
        uses: `${uses}@${version}`,
        ...step
    };
    return newStep;
}

/**
 * Finds an action in the config by org/repo
 * @param uses - The action to find (e.g., "actions/checkout")
 * @param config - The config to search in
 * @returns The action configuration or undefined if not found
 */
function findActionInConfig(uses: string, config: DotGithubConfig): DotGithubAction | undefined {
    return config.actions.find(action => action.orgRepo === uses);
}