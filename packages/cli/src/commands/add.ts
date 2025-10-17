import { Command } from 'commander';
import {
  generateActionFiles,
  type DotGithubContext,
  logger,
} from '@dotgithub/core';

export function createAddCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  return new Command('add')
    .argument(
      '<orgRepoRef...>',
      'One or more GitHub repository references (e.g., actions/checkout@v4, actions/setup-node@v4)'
    )
    .description(
      'Add GitHub Actions to configuration and generate TypeScript files'
    )
    .option(
      '--output <outputDir>',
      'Output directory for generated TypeScript files (uses config default if not specified)'
    )
    .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)')
    .option('--no-sha', 'Use the original ref instead of resolving to SHA')
    .option(
      '--name <name>',
      'Override the action name for type names and function names (e.g., setupNode)'
    )
    .action(async (orgRepoRefs, options) => {
      try {
        const context = createContext(options);
        const totalActions: any[] = [];

        logger.debug('Starting action generation process', {
          count: orgRepoRefs.length,
          refs: orgRepoRefs,
        });

        // Process each action reference
        for (const orgRepoRef of orgRepoRefs) {
          logger.debug(`Processing ${orgRepoRef}...`);

          const result = await generateActionFiles(context, {
            orgRepoRef,
            outputDir: options.output,
            token: options.token,
            useSha: options.sha !== false, // Default to true unless --no-sha is explicitly used
            customActionName: options.name,
          });

          // Handle multiple actions in the result
          if (result.actions && result.actions.length > 0) {
            logger.debug(
              `Generated ${result.actions.length} action(s) from ${orgRepoRef}`
            );
            for (const action of result.actions) {
              const location = action.actionPath
                ? `${action.actionPath}/${action.actionName}`
                : action.actionName;
              logger.debug(`Generated action: ${location}`, {
                filePath: action.filePath,
              });
              totalActions.push({ orgRepoRef, ...action });
            }
          } else {
            logger.debug(`Generated action: ${result.actionName}`, {
              filePath: result.filePath,
            });
            totalActions.push({
              orgRepoRef,
              filePath: result.filePath,
              actionName: result.actionName,
            });
          }
        }

        // Summary - only show if multiple actions or verbose
        if (totalActions.length > 1 || orgRepoRefs.length > 1) {
          logger.success(
            `Successfully generated ${totalActions.length} action(s) from ${orgRepoRefs.length} repository(ies)`
          );
        } else {
          logger.success(
            `Successfully generated ${totalActions[0]?.actionName || 'action'}`
          );
        }
        logger.debug('Actions tracked in dotgithub.json config file');
      } catch (err) {
        logger.failure('Action generation failed', {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        process.exit(1);
      }
    });
}
