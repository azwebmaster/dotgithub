import { Command } from 'commander';
import { StackSynthesizer } from '@dotgithub/core';
import * as path from 'path';

export function createSynthCommand(): Command {
  const synthCommand = new Command('synth');

  synthCommand
    .description('Synthesize GitHub workflows from configured stacks and plugins')
    .option('--dry-run', 'preview files without writing them to disk', false)
    .option('--output <dir>', 'output directory (default: .github)')
    .option('--stack <name>', 'synthesize only the specified stack')
    .option('--verbose', 'show detailed output', false)
    .action(async (options) => {
      try {
        const synthesizer = new StackSynthesizer({
          projectRoot: process.cwd(),
          outputDir: options.output
        });

        if (options.dryRun) {
          console.log('🧪 Dry run mode - no files will be written');
          
          const results = await synthesizer.synthesizeAll();
          
          if (!results.success) {
            console.error('❌ Synthesis failed:');
            for (const error of results.errors) {
              console.error(`   ${error.message}`);
            }
            process.exit(1);
          }

          if (results.results.length === 0) {
            console.log('📝 No stacks configured for synthesis');
            return;
          }

          console.log(`\n📋 Would synthesize ${results.results.length} stack(s):\n`);

          for (const result of results.results) {
            console.log(`🏗️  Stack: ${result.stackConfig.name}`);
            console.log(`   Plugins: ${result.stackConfig.plugins.join(', ')}`);
            
            if (options.verbose) {
              console.log('   Plugin execution results:');
              for (const pluginResult of result.pluginResults) {
                const status = pluginResult.success ? '✅' : '❌';
                console.log(`     ${status} ${pluginResult.plugin.name} (${pluginResult.duration}ms)`);
                if (!pluginResult.success && pluginResult.error) {
                  console.log(`        Error: ${pluginResult.error.message}`);
                }
              }
            }

            console.log('   Files to be written:');
            for (const filename of Object.keys(result.files)) {
              const filePath = path.join(result.outputPath, filename);
              console.log(`     📄 ${filePath}`);
            }

            if (options.verbose) {
              console.log('   File contents preview:');
              for (const [filename, content] of Object.entries(result.files)) {
                console.log(`\n     --- ${filename} ---`);
                console.log(content.split('\n').slice(0, 10).join('\n'));
                if (content.split('\n').length > 10) {
                  console.log('     ... (truncated)');
                }
              }
            }
            
            console.log();
          }

        } else {
          console.log('🏗️  Synthesizing GitHub workflows...');
          
          const results = await synthesizer.synthesizeAndWrite();
          
          if (!results.success) {
            console.error('❌ Synthesis failed:');
            for (const error of results.errors) {
              console.error(`   ${error.message}`);
            }
            process.exit(1);
          }

          if (results.results.length === 0) {
            console.log('📝 No stacks configured for synthesis');
            return;
          }

          console.log(`✅ Successfully synthesized ${results.results.length} stack(s):`);

          for (const result of results.results) {
            console.log(`\n🏗️  Stack: ${result.stackConfig.name}`);
            console.log(`   Plugins: ${result.stackConfig.plugins.join(', ')}`);
            
            if (options.verbose) {
              console.log('   Plugin execution results:');
              for (const pluginResult of result.pluginResults) {
                const status = pluginResult.success ? '✅' : '❌';
                console.log(`     ${status} ${pluginResult.plugin.name} (${pluginResult.duration}ms)`);
              }
            }

            console.log('   Files written:');
            for (const filename of Object.keys(result.files)) {
              const filePath = path.join(result.outputPath, filename);
              console.log(`     📄 ${filePath}`);
            }
          }

          console.log('\n🎉 Synthesis complete!');
        }

      } catch (error) {
        console.error('❌ Synthesis failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return synthCommand;
}