import { Command } from 'commander';
import { generateActionFiles } from '@dotgithub/core';

export function createAddCommand(): Command {
  return new Command('add')
    .argument('<orgRepoRef>', 'GitHub repository reference (e.g., actions/checkout@v4)')
    .description('Generate TypeScript types from a GitHub Action and save to output directory')
    .option('--output <outputDir>', 'Output directory for generated TypeScript file', '.github/actions')
    .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)')
    .action(async (orgRepoRef, options) => {
      try {
        const result = await generateActionFiles({
          orgRepoRef,
          outputDir: options.output,
          token: options.token
        });
        console.log(`Generated ${result.filePath} with action: ${result.actionName}`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}