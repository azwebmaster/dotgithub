import { Command } from 'commander';
import {
  getPluginsFromConfig,
  getStacksFromConfig,
  addPluginToConfig,
  removePluginFromConfig,
  addStackToConfig,
  removeStackFromConfig,
  generatePluginFromGitHubFiles,
  PluginManager,
  formatPluginDescription,
  generatePluginMarkdown,
  searchPluginsByKeyword,
  filterPluginsByCategory,
  type DotGithubContext,
  logger,
} from '@dotgithub/core';
import type { PluginConfig, StackConfig } from '@dotgithub/core';
import * as path from 'path';

export function createPluginCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  const pluginCommand = new Command('plugin');
  pluginCommand.description('Manage plugins and stacks');

  // Plugin management subcommands
  const pluginSubCommand = new Command('list')
    .description('List configured plugins')
    .action((options) => {
      const context = createContext(options);
      const plugins = context.config.plugins || [];

      if (plugins.length === 0) {
        logger.info('📝 No plugins configured');
        return;
      }

      logger.info(`🔌 Configured plugins (${plugins.length}):`);

      for (const plugin of plugins) {
        const status = plugin.enabled !== false ? '✅' : '❌';
        logger.info(`${status} ${plugin.name}`);
        logger.debug(`   Package: ${plugin.package}`);
        if (plugin.config && Object.keys(plugin.config).length > 0) {
          logger.debug(
            `   Config: ${JSON.stringify(plugin.config, null, 2)
              .split('\n')
              .map((line, i) => (i === 0 ? line : '           ' + line))
              .join('\n')}`
          );
        }
      }
    });

  const pluginAddCommand = new Command('add')
    .description('Add a plugin configuration')
    .requiredOption('--name <name>', 'plugin name')
    .requiredOption(
      '--package <package>',
      'plugin package (npm package or local path)'
    )
    .option('--enabled', 'enable the plugin (default: true)', true)
    .action((options) => {
      try {
        const context = createContext(options);

        let config = {};
        if (options.config) {
          try {
            config = JSON.parse(options.config);
          } catch (error) {
            logger.error(
              '❌ Invalid JSON configuration:',
              error instanceof Error ? error.message : error
            );
            process.exit(1);
          }
        }

        const pluginConfig: PluginConfig = {
          name: options.name,
          package: options.package,
          config,
          enabled: options.enabled,
        };

        addPluginToConfig(pluginConfig, context.configPath);
        logger.info(`✅ Added plugin "${options.name}"`);
      } catch (error) {
        logger.error(
          '❌ Failed to add plugin:',
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  const pluginRemoveCommand = new Command('remove')
    .description('Remove a plugin configuration')
    .requiredOption('--name <name>', 'plugin name')
    .action((options) => {
      try {
        const context = createContext(options);
        const removed = removePluginFromConfig(
          options.name,
          context.configPath
        );

        if (removed) {
          logger.info(`✅ Removed plugin "${options.name}"`);
        } else {
          logger.info(`❌ Plugin "${options.name}" not found`);
          process.exit(1);
        }
      } catch (error) {
        logger.error(
          '❌ Failed to remove plugin:',
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  const pluginCreateCommand = new Command('create')
    .description('Create a plugin from .github files')
    .requiredOption('--name <name>', 'plugin name')
    .requiredOption(
      '--source <path|repo|url>',
      'local path to .github directory, GitHub repo (org/repo@ref), or GitHub file URL'
    )
    .option('--description <desc>', 'plugin description')
    .option('--overwrite', 'overwrite existing plugin file')
    .option(
      '--auto-add-actions',
      'automatically add TypeScript actions found in workflows'
    )
    .option(
      '--token <token>',
      'GitHub token for auto-adding actions (overrides env GITHUB_TOKEN)'
    )
    .action(async (options) => {
      try {
        logger.info(
          `🔌 Creating plugin "${options.name}" from ${options.source}...`
        );

        const context = createContext(options);
        const result = await generatePluginFromGitHubFiles({
          pluginName: options.name,
          source: options.source,
          description: options.description,
          overwrite: options.overwrite,
          context,
          autoAddActions: options.autoAddActions,
          token: options.token,
        });

        logger.info(`✅ Plugin created successfully!`);
        logger.info(`   Plugin file: ${result.pluginPath}`);
        logger.info(`   Files included: ${result.filesFound.length}`);

        if (result.filesFound.length > 0) {
          logger.info(`   📁 Files found:`);
          result.filesFound.forEach((file) => {
            logger.info(`      - ${file}`);
          });
        }

        logger.info('');
        logger.info(`🔧 To use this plugin, add it to your configuration:`);
        const relativePluginPath = path.relative(
          process.cwd(),
          result.pluginPath
        );
        logger.info(
          `   dotgithub plugin add --name "${options.name}" --package "./${relativePluginPath}"`
        );
      } catch (error) {
        logger.error(
          '❌ Failed to create plugin:',
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  const pluginDescribeCommand = new Command('describe')
    .description('Describe plugin information and configuration schema')
    .option('--name <name>', 'specific plugin name to describe')
    .option('--format <format>', 'output format (text|markdown|json)', 'text')
    .option('--search <keyword>', 'search plugins by keyword')
    .option('--category <category>', 'filter plugins by category')
    .option('--all', 'describe all loaded plugins')
    .action(async (options) => {
      try {
        const context = createContext(options);
        const manager = new PluginManager({
          projectRoot: context.rootPath,
          context,
        });

        // Load plugins from config using the context
        const pluginConfigs = context.config.plugins || [];
        if (pluginConfigs.length === 0) {
          logger.info('📝 No plugins configured');
          return;
        }

        await manager.loadPlugins(pluginConfigs);

        if (options.name) {
          // Describe specific plugin
          const description = await manager.describePlugin(options.name);
          if (!description) {
            logger.info(`❌ Plugin "${options.name}" not found or not loaded`);
            process.exit(1);
          }

          switch (options.format) {
            case 'markdown':
              logger.info(generatePluginMarkdown(description));
              break;
            case 'json':
              logger.info(JSON.stringify(description, null, 2));
              break;
            default:
              logger.info(`\n🔌 Plugin: ${description.name}\n`);
              logger.info(formatPluginDescription(description));
          }
        } else if (options.search) {
          // Search plugins by keyword
          const pluginList = await manager.listPlugins();
          const descriptions = pluginList
            .map((p) => p.description)
            .filter((desc): desc is NonNullable<typeof desc> => desc !== null);

          const searchResults = searchPluginsByKeyword(
            descriptions,
            options.search
          );

          if (searchResults.length === 0) {
            logger.info(`🔍 No plugins found matching "${options.search}"`);
            return;
          }

          logger.info(
            `🔍 Found ${searchResults.length} plugin(s) matching "${options.search}":\n`
          );

          for (const description of searchResults) {
            logger.info(`\n🔌 Plugin: ${description.name}\n`);
            logger.info(formatPluginDescription(description));
            logger.info('\n' + '─'.repeat(50) + '\n');
          }
        } else if (options.category) {
          // Filter plugins by category
          const pluginList = await manager.listPlugins();
          const descriptions = pluginList
            .map((p) => p.description)
            .filter((desc): desc is NonNullable<typeof desc> => desc !== null);

          const categoryResults = filterPluginsByCategory(
            descriptions,
            options.category
          );

          if (categoryResults.length === 0) {
            logger.info(
              `📂 No plugins found in category "${options.category}"`
            );
            return;
          }

          logger.info(
            `📂 Found ${categoryResults.length} plugin(s) in category "${options.category}":\n`
          );

          for (const description of categoryResults) {
            logger.info(`\n🔌 Plugin: ${description.name}\n`);
            logger.info(formatPluginDescription(description));
            logger.info('\n' + '─'.repeat(50) + '\n');
          }
        } else if (options.all) {
          // Describe all plugins
          const pluginList = await manager.listPlugins();

          if (pluginList.length === 0) {
            logger.info('📝 No plugins loaded');
            return;
          }

          logger.info(`🔌 Loaded plugins (${pluginList.length}):\n`);

          for (const { name, description } of pluginList) {
            logger.info(`\n🔌 Plugin: ${name}\n`);
            if (description) {
              logger.info(formatPluginDescription(description));
            } else {
              logger.info('No description available');
            }
            logger.info('\n' + '─'.repeat(50) + '\n');
          }
        } else {
          // List available plugins with basic info
          const pluginList = await manager.listPlugins();

          if (pluginList.length === 0) {
            logger.info('📝 No plugins loaded');
            return;
          }

          logger.info(`🔌 Available plugins (${pluginList.length}):\n`);

          for (const { name, description } of pluginList) {
            const status = description ? '✅' : '❌';
            logger.info(`${status} ${name}`);
            if (description) {
              if (description.version)
                logger.info(`   Version: ${description.version}`);
              if (description.description)
                logger.info(`   Description: ${description.description}`);
              if (description.category)
                logger.info(`   Category: ${description.category}`);
              if (description.keywords && description.keywords.length > 0) {
                logger.info(`   Keywords: ${description.keywords.join(', ')}`);
              }
            }
            logger.info('');
          }

          logger.info(
            '💡 Use --name <plugin> to get detailed information about a specific plugin'
          );
          logger.info('💡 Use --search <keyword> to search plugins by keyword');
          logger.info('💡 Use --category <category> to filter by category');
          logger.info('💡 Use --all to describe all plugins');
        }
      } catch (error) {
        logger.error(
          '❌ Failed to describe plugins:',
          error instanceof Error ? error.message : error
        );
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
        logger.info('📝 No stacks configured');
        return;
      }

      logger.info(`🏗️  Configured stacks (${stacks.length}):\n`);

      for (const stack of stacks) {
        logger.info(`📦 ${stack.name}`);
        logger.info(
          `   Plugins: ${stack.plugins.length > 0 ? stack.plugins.join(', ') : '(none)'}`
        );
        if (stack.config && Object.keys(stack.config).length > 0) {
          logger.info(
            `   Config: ${JSON.stringify(stack.config, null, 2)
              .split('\n')
              .map((line, i) => (i === 0 ? line : '           ' + line))
              .join('\n')}`
          );
        }
        logger.info('');
      }
    });

  const stackAddCommand = new Command('add')
    .description('Add a stack configuration')
    .requiredOption('--name <name>', 'stack name')
    .requiredOption(
      '--plugins <plugins>',
      'comma-separated list of plugin names'
    )
    .action((options) => {
      try {
        const context = createContext(options);

        let config = {};
        if (options.config) {
          try {
            config = JSON.parse(options.config);
          } catch (error) {
            logger.error(
              '❌ Invalid JSON configuration:',
              error instanceof Error ? error.message : error
            );
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
          config,
        };

        addStackToConfig(stackConfig, context.configPath);
        logger.info(
          `✅ Added stack "${options.name}" with plugins: ${plugins.join(', ')}`
        );
      } catch (error) {
        logger.error(
          '❌ Failed to add stack:',
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  const stackRemoveCommand = new Command('remove')
    .description('Remove a stack configuration')
    .requiredOption('--name <name>', 'stack name')
    .action((options) => {
      try {
        const context = createContext(options);
        const removed = removeStackFromConfig(options.name, context.configPath);

        if (removed) {
          logger.info(`✅ Removed stack "${options.name}"`);
        } else {
          logger.info(`❌ Stack "${options.name}" not found`);
          process.exit(1);
        }
      } catch (error) {
        logger.error(
          '❌ Failed to remove stack:',
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  // Build command structure
  pluginCommand.addCommand(pluginSubCommand);
  pluginCommand.addCommand(pluginAddCommand);
  pluginCommand.addCommand(pluginRemoveCommand);
  pluginCommand.addCommand(pluginCreateCommand);
  pluginCommand.addCommand(pluginDescribeCommand);

  stackCommand.addCommand(stackListCommand);
  stackCommand.addCommand(stackAddCommand);
  stackCommand.addCommand(stackRemoveCommand);

  pluginCommand.addCommand(stackCommand);

  return pluginCommand;
}
