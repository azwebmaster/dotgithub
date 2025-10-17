import { Command } from 'commander';
import { DotGithubContext, getPinnedActions, getAllPinnedActions, logger } from '@dotgithub/core';

interface ListPinsCommandOptions {
  stack?: string;
  plugin?: string;
  all?: boolean;
}

export function createListPinsCommand(createContext: () => DotGithubContext): Command {
  const command = new Command('list-pins');
  
  command
    .description('List all pinned actions')
    .option('--stack <name>', 'List pins for specific stack')
    .option('--plugin <name>', 'List pins for specific plugin')
    .option('--all', 'Show all pinned actions across all scopes')
    .action(async (options: ListPinsCommandOptions) => {
      try {
        const context = createContext();
        
        // Validate that only one option is specified
        const optionCount = [options.stack, options.plugin, options.all].filter(Boolean).length;
        if (optionCount > 1) {
          throw new Error('Cannot specify multiple options. Use --all, --stack, or --plugin');
        }

        if (options.all) {
          // Show all pinned actions across all scopes
          const allPins = getAllPinnedActions(context);
          
          let hasAnyPins = false;
          
          // Show plugin pins
          if (Object.keys(allPins.plugins).length > 0) {
            hasAnyPins = true;
            logger.info('Plugin Overrides:');
            for (const [pluginName, actions] of Object.entries(allPins.plugins)) {
              logger.info(`  ${pluginName}:`);
              for (const [action, ref] of Object.entries(actions as Record<string, string>)) {
                logger.info(`    ${action}: ${ref}`);
              }
            }
            logger.info(''); // Empty line for separation
          }
          
          // Show stack pins
          if (Object.keys(allPins.stacks).length > 0) {
            hasAnyPins = true;
            logger.info('Stack Overrides:');
            for (const [stackName, actions] of Object.entries(allPins.stacks)) {
              logger.info(`  ${stackName}:`);
              for (const [action, ref] of Object.entries(actions as Record<string, string>)) {
                logger.info(`    ${action}: ${ref}`);
              }
            }
          }
          
          if (!hasAnyPins) {
            logger.info('No pinned actions found.');
          }
          
        } else if (options.plugin) {
          // Show pins for specific plugin
          const plugin = context.config.plugins?.find(p => p.name === options.plugin);
          if (!plugin) {
            throw new Error(`Plugin "${options.plugin}" not found`);
          }
          
          const pins = getPinnedActions({ plugin: options.plugin }, context);
          
          if (Object.keys(pins).length > 0) {
            logger.info(`Plugin Overrides (${options.plugin}):`);
            for (const [action, ref] of Object.entries(pins)) {
              logger.info(`  ${action}: ${ref}`);
            }
          } else {
            logger.info(`No pinned actions found for plugin "${options.plugin}".`);
          }
          
        } else if (options.stack) {
          // Show pins for specific stack
          const stack = context.config.stacks?.find(s => s.name === options.stack);
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
            logger.info(`No pinned actions found for stack "${options.stack}".`);
          }
          
        } else {
          // Default: show all pins
          const allPins = getAllPinnedActions(context);
          
          let hasAnyPins = false;
          
          // Show plugin pins
          if (Object.keys(allPins.plugins).length > 0) {
            hasAnyPins = true;
            logger.info('Plugin Overrides:');
            for (const [pluginName, actions] of Object.entries(allPins.plugins)) {
              logger.info(`  ${pluginName}:`);
              for (const [action, ref] of Object.entries(actions as Record<string, string>)) {
                logger.info(`    ${action}: ${ref}`);
              }
            }
            logger.info(''); // Empty line for separation
          }
          
          // Show stack pins
          if (Object.keys(allPins.stacks).length > 0) {
            hasAnyPins = true;
            logger.info('Stack Overrides:');
            for (const [stackName, actions] of Object.entries(allPins.stacks)) {
              logger.info(`  ${stackName}:`);
              for (const [action, ref] of Object.entries(actions as Record<string, string>)) {
                logger.info(`    ${action}: ${ref}`);
              }
            }
          }
          
          if (!hasAnyPins) {
            logger.info('No pinned actions found.');
          }
        }

      } catch (error) {
        logger.error(`Failed to list pins: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  return command;
}
