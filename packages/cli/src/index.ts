
import { Command } from 'commander';
import { generateTypesFromActionYml } from '@dotgithub/core';

export function helloCli(): string {
  return 'Hello from @dotgithub/cli!';
}

const program = new Command();

program
  .command('add <orgRepo>')
  .description('Generate TypeScript types from a GitHub Action action.yml')
  .option('-r, --ref <ref>', 'Git ref (branch, tag, or sha)')
  .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)')
  .action(async (orgRepo, options) => {
    try {
      const result = await generateTypesFromActionYml(orgRepo, options.ref, options.token);
      // Print raw output
      console.log(JSON.stringify(result));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse(process.argv);
}
