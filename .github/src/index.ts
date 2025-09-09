// GitHub Actions workspace entry point
import { createStep, GitHubStack } from "@dotgithub/core";
import { checkout } from "./actions/actions";

const x = new GitHubStack();
x.addWorkflow('example-workflow', {
  on: ['push'],
  jobs: {
    example_job: {
      'runs-on': 'ubuntu-latest',
      steps: [
        checkout({ 'fetch-depth': '0' })
      ]
    }
  }
});
