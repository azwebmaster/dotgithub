import { Command } from 'commander';
import { readConfig, writeConfig, getConfigPath, updateRootDir, getActionsFromConfig, getResolvedOutputPath, removeActionFromConfig, createConfigFile, type DotGithubContext } from '@dotgithub/core';

export function createConfigCommand(createContext: (options?: any) => DotGithubContext): Command {
  const configCmd = new Command('config')
    .description('Manage dotgithub configuration');

  // Show current config
  configCmd
    .command('show')
    .description('Show current configuration')
    .action((options) => {
      try {
        const context = createContext(options);
        
        console.log(`Configuration file: ${context.configPath}`);
        console.log('\nCurrent configuration:');
        console.log(JSON.stringify(context.config, null, 2));
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
        const context = createContext(options);
        const actions = context.config.actions;
        
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
          const { generateFunctionName } = require('@dotgithub/core/utils');
          const functionName = action.actionName ? generateFunctionName(action.actionName) : action.orgRepo;
          console.log(`\n• ${functionName}()`);
          console.log(`  Repository: ${action.orgRepo}@${action.versionRef} (SHA: ${action.ref.substring(0, 8)})`);
          console.log(`  Output: ${action.outputPath ? context.resolvePath(action.outputPath) : 'Not generated'}`);
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
    .action((directory, options) => {
      try {
        const context = createContext(options);
        context.config.rootDir = directory;
        writeConfig(context.config);
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
        const context = createContext(options);
        const originalLength = context.config.actions.length;
        
        // Remove the action for this org/repo
        context.config.actions = context.config.actions.filter(action => action.orgRepo !== orgRepo);
        
        if (context.config.actions.length !== originalLength) {
          writeConfig(context.config);
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
        const context = createContext(options);
        const fs = require('fs');
        if (fs.existsSync(context.configPath)) {
          console.log(`Configuration file already exists at: ${context.configPath}`);
          console.log('Use "dotgithub config show" to view current configuration');
          return;
        }
        
        // Create new config file in the specified format
        const configPath = createConfigFile(format, context.configPath);
        
        // Update output directory if specified
        if (options.outputDir) {
          const config = readConfig(configPath);
          config.rootDir = options.outputDir;
          writeConfig(config);
        }
        
        const config = readConfig(configPath);
        console.log(`Initialized dotgithub configuration at: ${configPath}`);
        console.log(`Format: ${format}`);
        console.log(`Default root directory: ${config.rootDir}`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return configCmd;
}