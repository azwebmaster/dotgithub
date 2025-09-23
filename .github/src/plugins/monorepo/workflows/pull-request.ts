import { run } from '@dotgithub/core';
import type { PluginContext } from '@dotgithub/core';

/**
 * pull-request workflow handler
 * Generated from: workflows/pull-request.yml
 */
export async function pullRequestHandler(
  context: PluginContext
): Promise<void> {
  const { stack } = context;

  stack.addWorkflow('pull-request', {
    name: 'Pull Request',
    on: {
      pull_request: {
        branches: ['main'],
      },
    },
    jobs: {
      ci: {
        name: 'CI',
        uses: './.github/workflows/shared-ci.yml',
      },
    },
  });
}
