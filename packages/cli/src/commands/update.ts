import { Command } from 'commander';
import { updateActionFiles, type DotGithubContext, logger } from '@dotgithub/core';

export function createUpdateCommand(createContext: (options?: any) => DotGithubContext): Command {
  return new Command('update')
    .argument('[orgRepoRef]', 'GitHub repository reference (e.g., actions/checkout). If not provided, updates all actions')
    .description('Update GitHub Actions to latest versions or use versionRef')
    .option('--output <outputDir>', 'Output directory for generated TypeScript files (uses config default if not specified)')
    .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)')
    .option('--latest', 'Use the latest git tag with semver parsing instead of versionRef')
    .option('--no-sha', 'Use the original ref instead of resolving to SHA')
    .action(async (orgRepoRef, options) => {
      try {
        const context = createContext(options);
        const result = await updateActionFiles(context, {
          orgRepoRef,
          outputDir: options.output,
          token: options.token,
          useLatest: options.latest,
          useSha: options.sha !== false  // Default to true unless --no-sha is explicitly used
        });

        if (result.updated.length === 0 && result.errors.length === 0) {
          logger.info('No actions needed updating.');
          return;
        }

        // Report successful updates
        if (result.updated.length > 0) {
          logger.success(`Successfully updated ${result.updated.length} action(s):`);
          for (const update of result.updated) {
            logger.info(`  ${update.orgRepo}: ${update.previousVersion} → ${update.newVersion}`);
            logger.debug(`    Generated: ${update.filePath}`);
          }
        }

        // Report errors
        if (result.errors.length > 0) {
          logger.error(`Failed to update ${result.errors.length} action(s):`);
          for (const error of result.errors) {
            logger.error(`  ${error.orgRepo}: ${error.error}`);
          }
          
          if (result.updated.length === 0) {
            process.exit(1);
          }
        }

        if (result.updated.length > 0) {
          logger.info('Actions updated in dotgithub.json config file');
        }
      } catch (err) {
        logger.failure('Failed to update actions', { 
          error: err instanceof Error ? err.message : String(err)
        });
        process.exit(1);
      }
    });
}