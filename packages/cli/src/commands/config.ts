import { Command } from 'commander';
import { readConfig, writeConfig, getConfigPath, updateOutputDir, getActionsFromConfig, getResolvedOutputPath, removeActionFromConfig, createConfigFile } from '@dotgithub/core';

export function createConfigCommand(): Command {
  const configCmd = new Command('config')
    .description('Manage dotgithub configuration');

  // Show current config
  configCmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      try {
        const config = readConfig();
        const configPath = getConfigPath();
        
        console.log(`Configuration file: ${configPath}`);
        console.log('\nCurrent configuration:');
        console.log(JSON.stringify(config, null, 2));
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // List tracked actions
  configCmd
    .command('list')
    .description('List all tracked actions')
    .option('--json', 'Output as JSON')
    .action((options) => {
      try {
        const actions = getActionsFromConfig();
        
        if (options.json) {
          console.log(JSON.stringify(actions, null, 2));
          return;
        }
        
        if (actions.length === 0) {
          console.log('No actions tracked yet. Add actions with "dotgithub add <action>"');
          return;
        }
        
        console.log('Tracked actions:');
        console.log('================');
        
        actions.forEach(action => {
          console.log(`\n• ${action.displayName}`);
          console.log(`  Repository: ${action.orgRepo}@${action.versionRef} (SHA: ${action.ref.substring(0, 8)})`);
          console.log(`  Output: ${getResolvedOutputPath(action)}`);
        });
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // Set output directory
  configCmd
    .command('set-output-dir <directory>')
    .description('Set default output directory for generated actions')
    .action((directory) => {
      try {
        updateOutputDir(directory);
        console.log(`Updated default output directory to: ${directory}`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // Remove action from tracking
  configCmd
    .command('remove <orgRepo>')
    .description('Remove action from tracking')
    .action((orgRepo, options) => {
      try {
        const removed = removeActionFromConfig(orgRepo);
        
        if (removed) {
          console.log(`Removed ${orgRepo} from tracking`);
        } else {
          console.log(`Action ${orgRepo} was not being tracked`);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // Initialize config file
  configCmd
    .command('init')
    .description('Initialize a new dotgithub config file')
    .option('--output-dir <dir>', 'Output directory for actions', '.github/actions')
    .option('--format <format>', 'Config file format (json, js, yaml, yml)', 'json')
    .action((options) => {
      try {
        const format = options.format as 'json' | 'js' | 'yaml' | 'yml';
        
        // Validate format
        if (!['json', 'js', 'yaml', 'yml'].includes(format)) {
          console.error('Invalid format. Supported formats: json, js, yaml, yml');
          process.exit(1);
        }
        
        // Check if any config already exists
        const currentConfigPath = getConfigPath();
        const fs = require('fs');
        if (fs.existsSync(currentConfigPath)) {
          console.log(`Configuration file already exists at: ${currentConfigPath}`);
          console.log('Use "dotgithub config show" to view current configuration');
          return;
        }
        
        // Create new config file in the specified format
        const configPath = createConfigFile(format);
        
        // Update output directory if specified
        if (options.outputDir) {
          const config = readConfig();
          config.outputDir = options.outputDir;
          writeConfig(config);
        }
        
        const config = readConfig();
        console.log(`Initialized dotgithub configuration at: ${configPath}`);
        console.log(`Format: ${format}`);
        console.log(`Default output directory: ${config.outputDir}`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return configCmd;
}