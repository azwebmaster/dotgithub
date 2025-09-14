import { Command } from 'commander';
import { 
  getPluginsFromConfig, 
  getStacksFromConfig,
  addPluginToConfig, 
  removePluginFromConfig,
  addStackToConfig,
  removeStackFromConfig,
  generatePluginFromGithubFiles,
  type DotGithubContext
} from '@dotgithub/core';
import type { PluginConfig, StackConfig } from '@dotgithub/core';
import * as path from 'path';

export function createPluginCommand(createContext: (options?: any) => DotGithubContext): Command {
  const pluginCommand = new Command('plugin');
  pluginCommand.description('Manage plugins and stacks');

  // Plugin management subcommands
  const pluginSubCommand = new Command('list')
    .description('List configured plugins')
    .action(() => {
      const plugins = getPluginsFromConfig();
      
      if (plugins.length === 0) {
        console.log('📝 No plugins configured');
        return;
      }

      console.log(`🔌 Configured plugins (${plugins.length}):\n`);
      
      for (const plugin of plugins) {
        const status = plugin.enabled !== false ? '✅' : '❌';
        console.log(`${status} ${plugin.name}`);
        console.log(`   Package: ${plugin.package}`);
        if (plugin.config && Object.keys(plugin.config).length > 0) {
          console.log(`   Config: ${JSON.stringify(plugin.config, null, 2).split('\n').map((line, i) => i === 0 ? line : '           ' + line).join('\n')}`);
        }
        console.log();
      }
    });

  const pluginAddCommand = new Command('add')
    .description('Add a plugin configuration')
    .requiredOption('--name <name>', 'plugin name')
    .requiredOption('--package <package>', 'plugin package (npm package or local path)')
    .option('--config <json>', 'plugin configuration as JSON string')
    .option('--enabled', 'enable the plugin (default: true)', true)
    .action((options) => {
      try {
        let config = {};
        if (options.config) {
          try {
            config = JSON.parse(options.config);
          } catch (error) {
            console.error('❌ Invalid JSON configuration:', error instanceof Error ? error.message : error);
            process.exit(1);
          }
        }

        const pluginConfig: PluginConfig = {
          name: options.name,
          package: options.package,
          config,
          enabled: options.enabled
        };

        addPluginToConfig(pluginConfig);
        console.log(`✅ Added plugin "${options.name}"`);
        
      } catch (error) {
        console.error('❌ Failed to add plugin:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const pluginRemoveCommand = new Command('remove')
    .description('Remove a plugin configuration')
    .requiredOption('--name <name>', 'plugin name')
    .action((options) => {
      try {
        const removed = removePluginFromConfig(options.name);
        
        if (removed) {
          console.log(`✅ Removed plugin "${options.name}"`);
        } else {
          console.log(`❌ Plugin "${options.name}" not found`);
          process.exit(1);
        }
        
      } catch (error) {
        console.error('❌ Failed to remove plugin:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const pluginCreateCommand = new Command('create')
    .description('Create a plugin from .github files')
    .requiredOption('--name <name>', 'plugin name')
    .requiredOption('--source <path|repo|url>', 'local path to .github directory, GitHub repo (org/repo@ref), or GitHub file URL')
    .option('--description <desc>', 'plugin description')
    .option('--overwrite', 'overwrite existing plugin file')
    .action(async (options) => {
      try {
        console.log(`🔌 Creating plugin "${options.name}" from ${options.source}...`);
        
        const context = createContext(options);
        const result = await generatePluginFromGithubFiles({
          pluginName: options.name,
          source: options.source,
          description: options.description,
          overwrite: options.overwrite,
          context
        });
        
        console.log(`✅ Plugin created successfully!`);
        console.log(`   Plugin file: ${result.pluginPath}`);
        console.log(`   Files included: ${result.filesFound.length}`);
        
        if (result.filesFound.length > 0) {
          console.log(`   📁 Files found:`);
          result.filesFound.forEach(file => {
            console.log(`      - ${file}`);
          });
        }
        
        console.log();
        console.log(`🔧 To use this plugin, add it to your configuration:`);
        const relativePluginPath = path.relative(process.cwd(), result.pluginPath);
        console.log(`   dotgithub plugin add --name "${options.name}" --package "./${relativePluginPath}"`);
        
      } catch (error) {
        console.error('❌ Failed to create plugin:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Stack management subcommands
  const stackCommand = new Command('stack');
  stackCommand.description('Manage GitHub stacks');

  const stackListCommand = new Command('list')
    .description('List configured stacks')
    .action(() => {
      const stacks = getStacksFromConfig();
      
      if (stacks.length === 0) {
        console.log('📝 No stacks configured');
        return;
      }

      console.log(`🏗️  Configured stacks (${stacks.length}):\n`);
      
      for (const stack of stacks) {
        console.log(`📦 ${stack.name}`);
        console.log(`   Plugins: ${stack.plugins.length > 0 ? stack.plugins.join(', ') : '(none)'}`);
        if (stack.config && Object.keys(stack.config).length > 0) {
          console.log(`   Config: ${JSON.stringify(stack.config, null, 2).split('\n').map((line, i) => i === 0 ? line : '           ' + line).join('\n')}`);
        }
        console.log();
      }
    });

  const stackAddCommand = new Command('add')
    .description('Add a stack configuration')
    .requiredOption('--name <name>', 'stack name')
    .requiredOption('--plugins <plugins>', 'comma-separated list of plugin names')
    .option('--config <json>', 'stack configuration as JSON string')
    .action((options) => {
      try {
        let config = {};
        if (options.config) {
          try {
            config = JSON.parse(options.config);
          } catch (error) {
            console.error('❌ Invalid JSON configuration:', error instanceof Error ? error.message : error);
            process.exit(1);
          }
        }

        const plugins = options.plugins
          .split(',')
          .map((plugin: string) => plugin.trim())
          .filter((plugin: string) => plugin.length > 0);

        const stackConfig: StackConfig = {
          name: options.name,
          plugins,
          config
        };

        addStackToConfig(stackConfig);
        console.log(`✅ Added stack "${options.name}" with plugins: ${plugins.join(', ')}`);
        
      } catch (error) {
        console.error('❌ Failed to add stack:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const stackRemoveCommand = new Command('remove')
    .description('Remove a stack configuration')
    .requiredOption('--name <name>', 'stack name')
    .action((options) => {
      try {
        const removed = removeStackFromConfig(options.name);
        
        if (removed) {
          console.log(`✅ Removed stack "${options.name}"`);
        } else {
          console.log(`❌ Stack "${options.name}" not found`);
          process.exit(1);
        }
        
      } catch (error) {
        console.error('❌ Failed to remove stack:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Build command structure
  pluginCommand.addCommand(pluginSubCommand);
  pluginCommand.addCommand(pluginAddCommand);
  pluginCommand.addCommand(pluginRemoveCommand);
  pluginCommand.addCommand(pluginCreateCommand);

  stackCommand.addCommand(stackListCommand);
  stackCommand.addCommand(stackAddCommand);
  stackCommand.addCommand(stackRemoveCommand);

  pluginCommand.addCommand(stackCommand);

  return pluginCommand;
}