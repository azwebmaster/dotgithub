
import { Command } from 'commander';
import { generateActionFiles } from '@dotgithub/core';

export function helloCli(): string {
  return 'Hello from @dotgithub/cli!';
}

const program = new Command();

program
  .command('add <orgRepoRef>')
  .description('Generate TypeScript types from a GitHub Action and save to output directory')
  .requiredOption('--output <outputDir>', 'Output directory for generated TypeScript file')
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

if (require.main === module) {
  program.parse(process.argv);
}
