import { cache } from '../../../actions/actions/cache/cache.js';
import { checkout } from '../../../actions/actions/checkout.js';
import { setupBun } from '../../../actions/oven-sh/setup-bun.js';
import { setupNodeJsEnvironment } from '../../../actions/actions/setup-node.js';

import { run } from '@dotgithub/core';
import type { PluginContext } from '@dotgithub/core';

/**
 * shared-ci workflow handler
 * Generated from: workflows/shared-ci.yml
 */
export async function sharedCiHandler(context: PluginContext): Promise<void> {
  const { stack } = context;

  stack.addWorkflow('shared-ci', {
    name: 'Shared CI',
    on: {
      workflow_call: {
        inputs: {
          'node-versions': {
            description: 'JSON array of Node.js versions to test',
            required: false,
            type: 'string',
            default: '[20, 22, 24]',
          },
        },
      },
    },
    jobs: {
      'build-and-test': {
        'runs-on': 'ubuntu-latest',
        strategy: {
          matrix: {
            'node-version': '${{ fromJson(inputs.node-versions) }}',
          },
        },
        steps: [
          checkout(),
          setupNodeJsEnvironment(
            {
              'node-version': '${{ matrix.node-version }}',
            },
            {
              name: 'Setup Node.js ${{ matrix.node-version }}',
            }
          ),
          setupBun({
            'bun-version': 'latest',
          }),
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
            name: 'Install dependencies',
          }),
          run('bun run build', {
            name: 'Build',
          }),
          run('bun run test', {
            name: 'Test',
          }),
        ],
      },
    },
  });
}
