import { Command } from 'commander';
import { DotGithubContext, removePinnedAction, logger } from '@dotgithub/core';

interface UnpinCommandOptions {
  stack?: string;
  construct?: string;
}

export function createUnpinCommand(
  createContext: () => DotGithubContext
): Command {
  const command = new Command('unpin');

  command
    .description('Remove a pinned action from a construct or stack')
    .argument('<action>', 'Action to unpin (e.g., actions/checkout)')
    .option('--stack <name>', 'Unpin from specific stack')
    .option('--construct <name>', 'Unpin from specific construct')
    .action(async (action: string, options: UnpinCommandOptions) => {
      try {
        // Validate action format
        if (!action.includes('/') || action.split('/').length !== 2) {
          throw new Error(
            'Action must be in format org/repo (e.g., actions/checkout)'
          );
        }

        // Validate that exactly one scope is specified
        if (!options.stack && !options.construct) {
          throw new Error('Must specify either --stack or --construct');
        }

        if (options.stack && options.construct) {
          throw new Error('Cannot specify both --stack and --construct');
        }

        const context = createContext();

        // Validate that the specified construct/stack exists
        if (options.construct) {
          const construct = context.config.constructs?.find(
            (c) => c.name === options.construct
          );
          if (!construct) {
            throw new Error(`Construct "${options.construct}" not found`);
          }
        }

        if (options.stack) {
          const stack = context.config.stacks?.find(
            (s) => s.name === options.stack
          );
          if (!stack) {
            throw new Error(`Stack "${options.stack}" not found`);
          }
        }

        // Remove the pinned action
        const removed = removePinnedAction(action, options, context);

        if (removed) {
          const scope = options.construct
            ? `construct "${options.construct}"`
            : `stack "${options.stack}"`;
          logger.info(`✅ Unpinned ${action} from ${scope}`);
        } else {
          const scope = options.construct
            ? `construct "${options.construct}"`
            : `stack "${options.stack}"`;
          logger.warn(`⚠️  ${action} was not pinned for ${scope}`);
        }
      } catch (error) {
        logger.error(
          `Failed to unpin action: ${error instanceof Error ? error.message : error}`
        );
        process.exit(1);
      }
    });

  return command;
}
