import { Command } from 'commander';
import { generateActionFiles, readConfig } from '@dotgithub/core';

export function createAddCommand(): Command {
  return new Command('add')
    .argument('<orgRepoRef>', 'GitHub repository reference (e.g., actions/checkout@v4, actions/checkout@latest, or actions/checkout - defaults to latest tag)')
    .description('Generate TypeScript types from a GitHub Action and save to output directory')
    .option('--output <outputDir>', 'Output directory for generated TypeScript file (uses config default if not specified)')
    .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)')
    .option('--no-sha', 'Use the original ref instead of resolving to SHA')
    .action(async (orgRepoRef, options) => {
      try {
        const result = await generateActionFiles({
          orgRepoRef,
          outputDir: options.output,
          token: options.token,
          useSha: options.sha !== false  // Default to true unless --no-sha is explicitly used
        });
        console.log(`Generated ${result.filePath} with action: ${result.actionName}`);
        console.log(`Action tracked in dotgithub.json config file`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}