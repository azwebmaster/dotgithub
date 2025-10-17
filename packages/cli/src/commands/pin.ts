import { Command } from 'commander';
import { DotGithubContext, setPinnedAction, logger } from '@dotgithub/core';

interface PinCommandOptions {
  stack?: string;
  plugin?: string;
}

export function createPinCommand(
  createContext: () => DotGithubContext
): Command {
  const command = new Command('pin');

  command
    .description('Pin an action to a specific version for a plugin or stack')
    .argument('<action>', 'Action to pin (e.g., actions/checkout)')
    .argument('<ref>', 'Version reference to pin to (e.g., v4, v5.1.0)')
    .option('--stack <name>', 'Pin for specific stack')
    .option('--plugin <name>', 'Pin for specific plugin')
    .action(async (action: string, ref: string, options: PinCommandOptions) => {
      try {
        // Validate action format
        if (!action.includes('/') || action.split('/').length !== 2) {
          throw new Error(
            'Action must be in format org/repo (e.g., actions/checkout)'
          );
        }

        // Validate that exactly one scope is specified
        if (!options.stack && !options.plugin) {
          throw new Error('Must specify either --stack or --plugin');
        }

        if (options.stack && options.plugin) {
          throw new Error('Cannot specify both --stack and --plugin');
        }

        const context = createContext();

        // Validate that the specified plugin/stack exists
        if (options.plugin) {
          const plugin = context.config.plugins?.find(
            (p) => p.name === options.plugin
          );
          if (!plugin) {
            throw new Error(`Plugin "${options.plugin}" not found`);
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
        const scope = options.plugin
          ? `plugin "${options.plugin}"`
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
