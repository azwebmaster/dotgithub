import { Command } from 'commander';
import { getActionsFromConfig, type DotGithubContext, logger, generateFunctionName } from '@dotgithub/core';

export function createListCommand(createContext: (options?: any) => DotGithubContext): Command {
  return new Command('list')
    .description('List all tracked GitHub Actions')
    .action(async (options) => {
      try {
        const context = createContext(options);
        const actions = context.config.actions;
        
        if (actions.length === 0) {
          logger.info('No actions are currently tracked.');
          return;
        }

        logger.info(`Found ${actions.length} tracked action${actions.length === 1 ? '' : 's'}:`);
        
        actions.forEach((action) => {
          const actionIdentifier = action.actionPath ? `${action.orgRepo}/${action.actionPath}` : action.orgRepo;
          logger.info(`  📦 ${actionIdentifier}`);
          logger.debug(`     Function Name: ${action.actionName ? generateFunctionName(action.actionName) : action.orgRepo}()`);
          logger.debug(`     Version: ${action.versionRef}`);
          logger.debug(`     SHA: ${action.ref}`);
          logger.debug(`     Output Path: ${action.outputPath ? context.resolvePath(action.outputPath) : 'Not generated'}`);
        });
      } catch (err) {
        logger.failure('Failed to list actions', { 
          error: err instanceof Error ? err.message : String(err)
        });
        process.exit(1);
      }
    });
}