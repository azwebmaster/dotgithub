import { Command } from 'commander';
import { DotGithubContext, setPinnedAction, logger } from '@dotgithub/core';

interface PinCommandOptions {
  stack?: string;
  construct?: string;
}

export function createPinCommand(
  createContext: () => DotGithubContext
): Command {
  const command = new Command('pin');

  command
    .description('Pin an action to a specific version for a construct or stack')
    .argument('<action>', 'Action to pin (e.g., actions/checkout)')
    .argument('<ref>', 'Version reference to pin to (e.g., v4, v5.1.0)')
    .option('--stack <name>', 'Pin for specific stack')
    .option('--construct <name>', 'Pin for specific construct')
    .action(async (action: string, ref: string, options: PinCommandOptions) => {
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

        // Set the pinned action
        setPinnedAction(action, ref, options, context);

        // Show confirmation message
        const scope = options.construct
          ? `construct "${options.construct}"`
          : `stack "${options.stack}"`;
        logger.info(`✅ Pinned ${action} to ${ref} for ${scope}`);
      } catch (error) {
        logger.error(
          `Failed to pin action: ${error instanceof Error ? error.message : error}`
        );
        process.exit(1);
      }
    });

  return command;
}
