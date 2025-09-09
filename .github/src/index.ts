// GitHub Actions workspace entry point
import { DotGitHubPlugin, PluginContext } from "@dotgithub/core";
import { checkout } from "./actions/actions/checkout.js";

class LocalPlugin implements DotGitHubPlugin {
  name = "local-plugin";
  version = "1.0.0";
  description = "A locally defined plugin";

  apply(context: PluginContext) {
    // General implementation goes here
    const { stack, config } = context;

    stack.addWorkflow("local-workflow", {
      name: "Local Workflow",
      on: {
        push: {
          branches: ["main"],
        },
      },
      jobs: {
        build: {
          "runs-on": "ubuntu-latest",
          steps: [
            checkout(),
            {
              name: "Run a one-line script",
              run: "echo Hello, world!",
            },
          ],
        },
      },
    });
  }
}

export default new LocalPlugin();
export * as actions from "./actions/index.js";
