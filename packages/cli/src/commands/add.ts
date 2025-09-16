import { Command } from 'commander';
import { generateActionFiles, type DotGithubContext } from '@dotgithub/core';

export function createAddCommand(createContext: (options?: any) => DotGithubContext): Command {
  return new Command('add')
    .argument('<orgRepoRef...>', 'One or more GitHub repository references (e.g., actions/checkout@v4, actions/setup-node@v4)')
    .description('Generate TypeScript types from one or more GitHub Actions and save to output directory')
    .option('--output <outputDir>', 'Output directory for generated TypeScript files (uses config default if not specified)')
    .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)')
    .option('--no-sha', 'Use the original ref instead of resolving to SHA')
    .action(async (orgRepoRefs, options) => {
      try {
        const context = createContext();
        const totalActions: any[] = [];

        // Process each action reference
        for (const orgRepoRef of orgRepoRefs) {
          console.log(`\nProcessing ${orgRepoRef}...`);
          const result = await generateActionFiles(context, {
            orgRepoRef,
            outputDir: options.output,
            token: options.token,
            useSha: options.sha !== false  // Default to true unless --no-sha is explicitly used
          });

          // Handle multiple actions in the result
          if (result.actions && result.actions.length > 0) {
            console.log(`Generated ${result.actions.length} action(s) from ${orgRepoRef}:`);
            for (const action of result.actions) {
              const location = action.actionPath ? `${action.actionPath}/${action.actionName}` : action.actionName;
              console.log(`  - ${location}: ${action.filePath}`);
              totalActions.push({ orgRepoRef, ...action });
            }
          } else {
            console.log(`Generated ${result.filePath} with action: ${result.actionName}`);
            totalActions.push({ orgRepoRef, filePath: result.filePath, actionName: result.actionName });
          }
        }

        // Summary
        console.log(`\n✅ Successfully generated ${totalActions.length} action(s) from ${orgRepoRefs.length} repository(ies)`);
        console.log(`Action(s) tracked in dotgithub.json config file`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}