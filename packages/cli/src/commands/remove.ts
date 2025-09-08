import { Command } from 'commander';
import { removeActionFiles } from '@dotgithub/core';

export function createRemoveCommand(): Command {
  return new Command('remove')
    .alias('rm')
    .argument('<orgRepoRef>', 'GitHub repository reference (e.g., actions/checkout@v4 or actions/checkout)')
    .description('Remove a GitHub Action from tracking and delete generated files')
    .option('--keep-files', 'Remove from tracking but keep generated files')
    .action(async (orgRepoRef, options) => {
      try {
        const result = await removeActionFiles({
          orgRepoRef,
          keepFiles: options.keepFiles
        });

        if (result.removed) {
          console.log(`Removed ${result.actionName} from tracking`);
          if (!options.keepFiles) {
            console.log(`Deleted generated files: ${result.removedFiles.join(', ')}`);
          }
        } else {
          console.log(`No matching action found for: ${orgRepoRef}`);
          process.exit(1);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}