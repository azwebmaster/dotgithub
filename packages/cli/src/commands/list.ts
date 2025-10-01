import { Command } from 'commander';
import { getActionsFromConfig, type DotGithubContext } from '@dotgithub/core';

export function createListCommand(createContext: (options?: any) => DotGithubContext): Command {
  return new Command('list')
    .description('List all tracked GitHub Actions')
    .action(async (options) => {
      try {
        const context = createContext(options);
        const actions = context.config.actions;
        
        if (actions.length === 0) {
          console.log('No actions are currently tracked.');
          return;
        }

        console.log(`Found ${actions.length} tracked action${actions.length === 1 ? '' : 's'}:\n`);
        
        actions.forEach((action, index) => {
          const { generateFunctionName } = require('@dotgithub/core/utils');
          const functionName = action.actionName ? generateFunctionName(action.actionName) : action.orgRepo;
          console.log(`${index + 1}. ${functionName}()`);
          console.log(`   Repository: ${action.orgRepo}`);
          console.log(`   Version: ${action.versionRef}`);
          console.log(`   SHA: ${action.ref}`);
          console.log(`   Output Path: ${action.outputPath ? context.resolvePath(action.outputPath) : 'Not generated'}`);
          if (index < actions.length - 1) {
            console.log('');
          }
        });
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}