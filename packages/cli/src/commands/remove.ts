import { Command } from 'commander';
import {
  removeActionFiles,
  type DotGithubContext,
  logger,
} from '@dotgithub/core';

export function createRemoveCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  return new Command('remove')
    .alias('rm')
    .argument(
      '<orgRepoRef>',
      'GitHub repository reference (e.g., actions/checkout@v4 or actions/checkout)'
    )
    .description(
      'Remove a GitHub Action from tracking and delete generated files'
    )
    .option('--keep-files', 'Remove from tracking but keep generated files')
    .action(async (orgRepoRef, options) => {
      try {
        const context = createContext(options);
        const result = await removeActionFiles(context, {
          orgRepoRef,
          keepFiles: options.keepFiles,
        });

        if (result.removed) {
          logger.success(`Removed ${result.actionName} from tracking`);
          if (!options.keepFiles) {
            logger.info(
              `Deleted generated files: ${result.removedFiles.join(', ')}`
            );
          }
        } else {
          logger.warn(`No matching action found for: ${orgRepoRef}`);
          process.exit(1);
        }
      } catch (err) {
        logger.failure('Failed to remove action', {
          error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
      }
    });
}
