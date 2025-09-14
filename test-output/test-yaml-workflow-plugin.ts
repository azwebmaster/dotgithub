import type { DotGitHubPlugin, PluginContext } from '@dotgithub/core';
import type { GitHubWorkflows, GitHubWorkflow } from '@dotgithub/core';
import { checkout, setupNodeJsEnvironment } from '../generated-actions';

/**
 * Plugin generated from node.js.yml
 * 
 * This plugin was auto-generated from .github files.
 * Files included: workflows/node.js.yml
 */
export class TestYamlWorkflowPlugin implements DotGitHubPlugin {
  readonly name = 'test-yaml-workflow';
  readonly version = '1.0.0';
  readonly description = 'Plugin generated from node.js.yml';

  private readonly workflows: GitHubWorkflows = {
    'node.js': {
      name: "Node.js CI",
      on: {
        push: {
          branches: [
            "$default-branch"
          ]
        },
        pull_request: {
          branches: [
            "$default-branch"
          ]
        }
      },
      jobs: {
        build: {
          "runs-on": "ubuntu-latest",
          strategy: {
            matrix: {
              "node-version": [
                "18.x",
                "20.x",
                "22.x"
              ]
            }
          },
          steps: [
            checkout({}, {}),
            setupNodeJsEnvironment({
              "node-version": "${{ matrix.node-version }}",
              cache: "npm"
            }, {
              name: "Use Node.js ${{ matrix.node-version }}"
            }),
            {
              run: "npm ci"
            },
            {
              run: "npm run build --if-present"
            },
            {
              run: "npm test"
            }
          ]
        }
      }
    }
  };


  async applyWorkflows(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    stack.addWorkflow('node.js', this.workflows['node.js']);
  }

  async applyResources(_context: PluginContext): Promise<void> {
    // This plugin doesn't define any resources
  }

  async apply(context: PluginContext): Promise<void> {
    await this.applyWorkflows(context);
    await this.applyResources(context);
  }
}

// Export as default for easier importing
export default new TestYamlWorkflowPlugin();
