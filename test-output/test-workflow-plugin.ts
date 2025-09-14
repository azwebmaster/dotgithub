import type { DotGitHubPlugin, PluginContext } from '@dotgithub/core';
import type { GitHubWorkflows, GitHubWorkflow } from '@dotgithub/core';
import { checkout, setupNodeJsEnvironment } from '../generated-actions';

/**
 * Plugin generated from npm-publish.yml
 * 
 * This plugin was auto-generated from .github files.
 * Files included: workflows/npm-publish.yml
 */
export class TestWorkflowPlugin implements DotGitHubPlugin {
  readonly name = 'test-workflow';
  readonly version = '1.0.0';
  readonly description = 'Plugin generated from npm-publish.yml';

  private readonly workflows: GitHubWorkflows = {
    'npm-publish': {
      name: "Node.js Package",
      on: {
        release: {
          types: [
            "created"
          ]
        }
      },
      jobs: {
        build: {
          "runs-on": "ubuntu-latest",
          steps: [
            checkout({}, {}),
            setupNodeJsEnvironment({
              "node-version": 20
            }, {}),
            {
              run: "npm ci"
            },
            {
              run: "npm test"
            }
          ]
        },
        "publish-npm": {
          needs: "build",
          "runs-on": "ubuntu-latest",
          steps: [
            checkout({}, {}),
            setupNodeJsEnvironment({
              "node-version": 20,
              "registry-url": "https://registry.npmjs.org/"
            }, {}),
            {
              run: "npm ci"
            },
            {
              run: "npm publish",
              env: {
                NODE_AUTH_TOKEN: "${{secrets.npm_token}}"
              }
            }
          ]
        }
      }
    }
  };


  async applyWorkflows(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    stack.addWorkflow('npm-publish', this.workflows['npm-publish']);
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
export default new TestWorkflowPlugin();
