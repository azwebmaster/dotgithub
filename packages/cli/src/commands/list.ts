import { Command } from 'commander';
import { getActionsFromConfig } from '@dotgithub/core';

export function createListCommand(): Command {
  return new Command('list')
    .description('List all tracked GitHub Actions')
    .action(async () => {
      try {
        const actions = getActionsFromConfig();
        
        if (actions.length === 0) {
          console.log('No actions are currently tracked.');
          return;
        }

        console.log(`Found ${actions.length} tracked action${actions.length === 1 ? '' : 's'}:\n`);
        
        actions.forEach((action, index) => {
          console.log(`${index + 1}. ${action.displayName}`);
          console.log(`   Repository: ${action.orgRepo}`);
          console.log(`   Version: ${action.versionRef}`);
          console.log(`   SHA: ${action.ref}`);
          console.log(`   Output Path: ${action.outputPath}`);
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