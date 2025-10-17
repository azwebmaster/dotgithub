import { Command } from 'commander';
import {
  StackSynthesizer,
  type DotGithubContext,
  logger,
} from '@dotgithub/core';
import * as path from 'path';

export function createSynthCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  const synthCommand = new Command('synth');

  synthCommand
    .description(
      'Synthesize GitHub workflows from configured stacks and plugins'
    )
    .option('--dry-run', 'preview files without writing them to disk', false)
    .option(
      '--output <dir>',
      'output directory (default: config outputDir relative to config file)'
    )
    .option('--stack <name>', 'synthesize only the specified stack')
    .option('--verbose', 'show detailed output', false)
    .action(async (options) => {
      try {
        const context = createContext(options);

        // Determine output path: use --output relative to cwd, or config.outputDir relative to config file if not specified
        const outputPath = options.output
          ? path.resolve(process.cwd(), options.output)
          : path.join(
              path.dirname(context.configPath),
              context.config.outputDir
            );

        const synthesizer = new StackSynthesizer({
          context,
          projectRoot: process.cwd(),
          outputPath,
        });

        if (options.dryRun) {
          logger.info('🧪 Dry run mode - no files will be written');

          const results = await synthesizer.synthesizeAll();

          if (!results.success) {
            logger.failure('Synthesis failed');
            for (const error of results.errors) {
              logger.error(`   ${error.message}`);
            }
            process.exit(1);
          }

          if (results.results.length === 0) {
            logger.info('📝 No stacks configured for synthesis');
            return;
          }

          logger.info(
            `📋 Would synthesize ${results.results.length} stack(s):`
          );

          for (const result of results.results) {
            logger.info(`🏗️  Stack: ${result.stackConfig.name}`);
            logger.debug(
              `   Plugins: ${result.stackConfig.plugins.join(', ')}`
            );

            if (options.verbose) {
              logger.info('   Plugin execution results:');
              for (const pluginResult of result.pluginResults) {
                const status = pluginResult.success ? '✅' : '❌';
                logger.info(
                  `     ${status} ${pluginResult.plugin.name} (${pluginResult.duration}ms)`
                );
                if (!pluginResult.success && pluginResult.error) {
                  logger.error(`        Error: ${pluginResult.error.message}`);
                }
              }
            }

            logger.debug('   Files to be written:');
            for (const filename of Object.keys(result.files)) {
              const filePath = path.join(result.outputPath, filename);
              logger.debug(`     📄 ${filePath}`);
            }

            if (options.verbose) {
              logger.info('   File contents preview:');
              for (const [filename, content] of Object.entries(result.files)) {
                logger.info(`\n     --- ${filename} ---`);
                logger.info(content.split('\n').slice(0, 10).join('\n'));
                if (content.split('\n').length > 10) {
                  logger.info('     ... (truncated)');
                }
              }
            }
          }
        } else {
          logger.info('Synthesizing GitHub workflows...');

          const results = await synthesizer.synthesizeAndWrite();

          if (!results.success) {
            logger.failure('Synthesis failed');
            for (const error of results.errors) {
              logger.error(`   ${error.message}`);
            }
            process.exit(1);
          }

          if (results.results.length === 0) {
            logger.info('📝 No stacks configured for synthesis');
            return;
          }

          logger.success(
            `Successfully synthesized ${results.results.length} stack(s):`
          );

          for (const result of results.results) {
            logger.info(`🏗️  Stack: ${result.stackConfig.name}`);
            logger.debug(
              `   Plugins: ${result.stackConfig.plugins.join(', ')}`
            );

            if (options.verbose) {
              logger.info('   Plugin execution results:');
              for (const pluginResult of result.pluginResults) {
                const status = pluginResult.success ? '✅' : '❌';
                logger.info(
                  `     ${status} ${pluginResult.plugin.name} (${pluginResult.duration}ms)`
                );
              }
            }

            logger.debug('   Files written:');
            for (const filename of Object.keys(result.files)) {
              const filePath = path.join(result.outputPath, filename);
              logger.debug(`     📄 ${filePath}`);
            }
          }

          logger.success('Synthesis complete!');
        }
      } catch (error) {
        logger.failure('Synthesis failed', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
      }
    });

  return synthCommand;
}
