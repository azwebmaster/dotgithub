import type { DotGitHubPlugin, PluginContext } from '@dotgithub/core';

import { sharedCiHandler } from './workflows/shared-ci';
import { pullRequestHandler } from './workflows/pull-request';
import { mainHandler } from './workflows/main';

/**
 * Plugin generated from .github files
 *
 * This plugin was auto-generated from .github files.
 * Files included: workflows/shared-ci.yml, workflows/pull-request.yml, workflows/main.yml, copilot-instructions.md, dotgithub.json
 */
export class MonorepoPlugin implements DotGitHubPlugin {
  readonly name = 'monorepo';
  readonly version = '1.0.0';
  readonly description = 'Plugin generated from .github files';

  async applyWorkflows(context: PluginContext): Promise<void> {
    await sharedCiHandler(context);
    await pullRequestHandler(context);
    await mainHandler(context);
  }

  async applyResources(context: PluginContext): Promise<void> {
    
  }

  async apply(context: PluginContext): Promise<void> {
    await this.applyWorkflows(context);
    await this.applyResources(context);
  }
}

// Export as default for easier importing
export default new MonorepoPlugin();
