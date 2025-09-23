import { cache } from '../../../actions/actions/cache/cache.js';
import { changesets } from '../../../actions/changesets/action.js';
import { checkout } from '../../../actions/actions/checkout.js';
import { setupBun } from '../../../actions/oven-sh/setup-bun.js';
import { setupNodeJsEnvironment } from '../../../actions/actions/setup-node.js';

import { run } from '@dotgithub/core';
import type { PluginContext } from '@dotgithub/core';

/**
 * main workflow handler
 * Generated from: workflows/main.yml
 */
export async function mainHandler(context: PluginContext): Promise<void> {
  const { stack } = context;

  stack.addWorkflow('main', {
    name: 'Main',
    on: {
      push: {
        branches: ['main'],
      },
      workflow_dispatch: null,
    },
    concurrency: '${{ github.workflow }}-${{ github.ref }}',
    jobs: {
      ci: {
        name: 'CI',
        uses: './.github/workflows/shared-ci.yml',
      },
      publish: {
        name: 'Publish',
        'runs-on': 'ubuntu-latest',
        needs: 'ci',
        steps: [
          checkout(
            {},
            {
              name: 'Checkout Repo',
            }
          ),
          setupBun(
            {
              'bun-version': 'latest',
            },
            {
              name: 'Setup Bun',
            }
          ),
          cache(
            {
              path: '~/.bun/install/cache',
              key: "${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}",
              'restore-keys': '${{ runner.os }}-bun-\n',
            },
            {
              name: 'Cache Bun dependencies',
            }
          ),
          run('bun install', {
            name: 'Install Dependencies',
          }),
          run('bun run build', {
            name: 'Build',
          }),
          setupNodeJsEnvironment(
            {
              'node-version': '18',
              'registry-url': 'https://registry.npmjs.org',
            },
            {
              name: 'Setup Node.js for NPM',
            }
          ),
          changesets(
            {
              publish: 'bun run release',
              version: 'bun run version',
              commit: 'chore: release package',
              title: 'chore: release package',
            },
            {
              name: 'Create Release Pull Request or Publish to NPM',
              id: 'changesets',
              env: {
                GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
                NODE_AUTH_TOKEN: '${{ secrets.NPM_AUTH_TOKEN }}',
              },
            }
          ),
        ],
      },
    },
  });
}
