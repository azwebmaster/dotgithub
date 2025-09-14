import type { DotGitHubPlugin, PluginContext } from '@dotgithub/core';

/**
 * Test plugin from GitHub URL
 * 
 * This plugin was auto-generated from .github files.
 * Files included: npm-publish.yml
 */
export class TestUrlPluginPlugin implements DotGitHubPlugin {
  readonly name = 'test-url-plugin';
  readonly version = '1.0.0';
  readonly description = 'Test plugin from GitHub URL';


  private readonly files: Record<string, any> = {
    'npm-publish.yml': {
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
            {
              uses: "actions/checkout@v4"
            },
            {
              uses: "actions/setup-node@v4",
              with: {
                "node-version": 20
              }
            },
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
            {
              uses: "actions/checkout@v4"
            },
            {
              uses: "actions/setup-node@v4",
              with: {
                "node-version": 20,
                "registry-url": "https://registry.npmjs.org/"
              }
            },
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

  async applyWorkflows(_context: PluginContext): Promise<void> {
    // This plugin doesn't define any workflows
  }

  async applyResources(context: PluginContext): Promise<void> {
    const { stack } = context;
    
    stack.addResource('npm-publish.yml', { content: this.files['npm-publish.yml'] });
  }


  async apply(context: PluginContext): Promise<void> {
    await this.applyWorkflows(context);
    await this.applyResources(context);
  }
}

// Export as default for easier importing
export default new TestUrlPluginPlugin();
