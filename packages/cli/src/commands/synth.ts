import { Command } from 'commander';
import {
  StackSynthesizer,
  type DotGithubContext,
  logger,
} from '@dotgithub/core';
import * as path from 'path';
import { spawn } from 'node:child_process';

/** Directory containing the package.json with the build script (e.g. .github/src). */
function resolveBuildDir(configPath: string): string {
  return path.join(path.dirname(configPath), 'src');
}

function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function runNpmBuild(configPath: string): Promise<void> {
  const buildDir = resolveBuildDir(configPath);
  logger.info('Running npm run build in .github/src');

  await new Promise<void>((resolve, reject) => {
    const child = spawn(getNpmCommand(), ['run', 'build'], {
      cwd: buildDir,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npm run build failed with exit code ${code}`));
    });
  });
}

export function createSynthCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  const synthCommand = new Command('synth');

  synthCommand
    .description(
      'Synthesize GitHub workflows from configured stacks and constructs'
    )
    .option('--dry-run', 'preview files without writing them to disk', false)
    .option('--no-build', 'skip running build in .github/src before synthesis')
    .option(
      '--output <dir>',
      'output directory (default: config outputDir relative to config file)'
    )
    .option('--stack <name>', 'synthesize only the specified stack')
    .option('--verbose', 'show detailed output', false)
    .action(async (options) => {
      try {
        const context = createContext(options);

        if (options.build !== false) {
          await runNpmBuild(context.configPath);
        }

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
              `   Constructs: ${result.stackConfig.constructs.join(', ')}`
            );

            if (options.verbose) {
              logger.info('   Construct execution results:');
              for (const constructResult of result.constructResults) {
                const status = constructResult.success ? '✅' : '❌';
                logger.info(
                  `     ${status} ${constructResult.construct.name} (${constructResult.duration}ms)`
                );
                if (!constructResult.success && constructResult.error) {
                  logger.error(
                    `        Error: ${constructResult.error.message}`
                  );
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
              `   Constructs: ${result.stackConfig.constructs.join(', ')}`
            );

            if (options.verbose) {
              logger.info('   Construct execution results:');
              for (const constructResult of result.constructResults) {
                const status = constructResult.success ? '✅' : '❌';
                logger.info(
                  `     ${status} ${constructResult.construct.name} (${constructResult.duration}ms)`
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
