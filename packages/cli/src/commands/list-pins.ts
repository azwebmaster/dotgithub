import { Command } from 'commander';
import {
  DotGithubContext,
  getPinnedActions,
  getAllPinnedActions,
  logger,
} from '@dotgithub/core';

interface ListPinsCommandOptions {
  stack?: string;
  construct?: string;
  all?: boolean;
}

export function createListPinsCommand(
  createContext: () => DotGithubContext
): Command {
  const command = new Command('list-pins');

  command
    .description('List all pinned actions')
    .option('--stack <name>', 'List pins for specific stack')
    .option('--construct <name>', 'List pins for specific construct')
    .option('--all', 'Show all pinned actions across all scopes')
    .action(async (options: ListPinsCommandOptions) => {
      try {
        const context = createContext();

        // Validate that only one option is specified
        const optionCount = [
          options.stack,
          options.construct,
          options.all,
        ].filter(Boolean).length;
        if (optionCount > 1) {
          throw new Error(
            'Cannot specify multiple options. Use --all, --stack, or --construct'
          );
        }

        if (options.all) {
          const allPins = getAllPinnedActions(context);

          let hasAnyPins = false;

          if (Object.keys(allPins.constructs).length > 0) {
            hasAnyPins = true;
            logger.info('Construct Overrides:');
            for (const [constructName, actions] of Object.entries(
              allPins.constructs
            )) {
              logger.info(`  ${constructName}:`);
              for (const [action, ref] of Object.entries(
                actions as Record<string, string>
              )) {
                logger.info(`    ${action}: ${ref}`);
              }
            }
            logger.info('');
          }

          if (Object.keys(allPins.stacks).length > 0) {
            hasAnyPins = true;
            logger.info('Stack Overrides:');
            for (const [stackName, actions] of Object.entries(allPins.stacks)) {
              logger.info(`  ${stackName}:`);
              for (const [action, ref] of Object.entries(
                actions as Record<string, string>
              )) {
                logger.info(`    ${action}: ${ref}`);
              }
            }
          }

          if (!hasAnyPins) {
            logger.info('No pinned actions found.');
          }
        } else if (options.construct) {
          const construct = context.config.constructs?.find(
            (c) => c.name === options.construct
          );
          if (!construct) {
            throw new Error(`Construct "${options.construct}" not found`);
          }

          const pins = getPinnedActions(
            { construct: options.construct },
            context
          );

          if (Object.keys(pins).length > 0) {
            logger.info(`Construct Overrides (${options.construct}):`);
            for (const [action, ref] of Object.entries(pins)) {
              logger.info(`  ${action}: ${ref}`);
            }
          } else {
            logger.info(
              `No pinned actions found for construct "${options.construct}".`
            );
          }
        } else if (options.stack) {
          // Show pins for specific stack
          const stack = context.config.stacks?.find(
            (s) => s.name === options.stack
          );
          if (!stack) {
            throw new Error(`Stack "${options.stack}" not found`);
          }

          const pins = getPinnedActions({ stack: options.stack }, context);

          if (Object.keys(pins).length > 0) {
            logger.info(`Stack Overrides (${options.stack}):`);
            for (const [action, ref] of Object.entries(pins)) {
              logger.info(`  ${action}: ${ref}`);
            }
          } else {
            logger.info(
              `No pinned actions found for stack "${options.stack}".`
            );
          }
        } else {
          const allPins = getAllPinnedActions(context);

          let hasAnyPins = false;

          if (Object.keys(allPins.constructs).length > 0) {
            hasAnyPins = true;
            logger.info('Construct Overrides:');
            for (const [constructName, actions] of Object.entries(
              allPins.constructs
            )) {
              logger.info(`  ${constructName}:`);
              for (const [action, ref] of Object.entries(
                actions as Record<string, string>
              )) {
                logger.info(`    ${action}: ${ref}`);
              }
            }
            logger.info('');
          }

          if (Object.keys(allPins.stacks).length > 0) {
            hasAnyPins = true;
            logger.info('Stack Overrides:');
            for (const [stackName, actions] of Object.entries(allPins.stacks)) {
              logger.info(`  ${stackName}:`);
              for (const [action, ref] of Object.entries(
                actions as Record<string, string>
              )) {
                logger.info(`    ${action}: ${ref}`);
              }
            }
          }

          if (!hasAnyPins) {
            logger.info('No pinned actions found.');
          }
        }
      } catch (error) {
        logger.error(
          `Failed to list pins: ${error instanceof Error ? error.message : error}`
        );
        process.exit(1);
      }
    });

  return command;
}
