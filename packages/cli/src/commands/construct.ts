import { Command } from 'commander';
import {
  getConstructsFromConfig,
  getStacksFromConfig,
  addConstructToConfig,
  removeConstructFromConfig,
  addStackToConfig,
  removeStackFromConfig,
  generateConstructFromGitHubFiles,
  ConstructManager,
  formatConstructDescription,
  generateConstructMarkdown,
  searchConstructsByKeyword,
  filterConstructsByCategory,
  type DotGithubContext,
  logger,
} from '@dotgithub/core';
import type { ConstructConfig, StackConfig } from '@dotgithub/core';
import * as path from 'path';

export function createConstructCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  const constructCommand = new Command('construct');
  constructCommand.description('Manage constructs and stacks');

  // Construct management subcommands
  const constructSubCommand = new Command('list')
    .description('List configured constructs')
    .action((options) => {
      const context = createContext(options);
      const constructs = context.config.constructs || [];

      if (constructs.length === 0) {
        logger.info('📝 No constructs configured');
        return;
      }

      logger.info(`🔌 Configured constructs (${constructs.length}):`);

      for (const construct of constructs) {
        const status = construct.enabled !== false ? '✅' : '❌';
        logger.info(`${status} ${construct.name}`);
        logger.debug(`   Package: ${construct.package}`);
        if (construct.config && Object.keys(construct.config).length > 0) {
          logger.debug(
            `   Config: ${JSON.stringify(construct.config, null, 2)
              .split('\n')
              .map((line, i) => (i === 0 ? line : '           ' + line))
              .join('\n')}`
          );
        }
      }
    });

  const constructAddCommand = new Command('add')
    .description('Add a construct configuration')
    .requiredOption('--name <name>', 'construct name')
    .requiredOption(
      '--package <package>',
      'construct package (npm package or local path)'
    )
    .option('--enabled', 'enable the construct (default: true)', true)
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

        const constructConfig: ConstructConfig = {
          name: options.name,
          package: options.package,
          config,
          enabled: options.enabled,
        };

        addConstructToConfig(constructConfig, context.configPath);
        logger.info(`✅ Added construct "${options.name}"`);
      } catch (error) {
        logger.error(
          '❌ Failed to add construct:',
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  const constructRemoveCommand = new Command('remove')
    .description('Remove a construct configuration')
    .requiredOption('--name <name>', 'construct name')
    .action((options) => {
      try {
        const context = createContext(options);
        const removed = removeConstructFromConfig(
          options.name,
          context.configPath
        );

        if (removed) {
          logger.info(`✅ Removed construct "${options.name}"`);
        } else {
          logger.info(`❌ Construct "${options.name}" not found`);
          process.exit(1);
        }
      } catch (error) {
        logger.error(
          '❌ Failed to remove construct:',
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  const constructCreateCommand = new Command('create')
    .description('Create a construct from .github files')
    .requiredOption('--name <name>', 'construct name')
    .requiredOption(
      '--source <path|repo|url>',
      'local path to .github directory, GitHub repo (org/repo@ref), or GitHub file URL'
    )
    .option('--description <desc>', 'construct description')
    .option('--overwrite', 'overwrite existing construct file')
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
          `🔌 Creating construct "${options.name}" from ${options.source}...`
        );

        const context = createContext(options);
        const result = await generateConstructFromGitHubFiles({
          constructName: options.name,
          source: options.source,
          description: options.description,
          overwrite: options.overwrite,
          context,
          autoAddActions: options.autoAddActions,
          token: options.token,
        });

        logger.info(`✅ Construct created successfully!`);
        logger.info(`   Construct file: ${result.constructPath}`);
        logger.info(`   Files included: ${result.filesFound.length}`);

        if (result.filesFound.length > 0) {
          logger.info(`   📁 Files found:`);
          result.filesFound.forEach((file) => {
            logger.info(`      - ${file}`);
          });
        }

        logger.info('');
        logger.info(`🔧 To use this construct, add it to your configuration:`);
        const configDir = path.dirname(context.configPath);
        const relativeConstructPath = path.relative(
          configDir,
          result.constructPath
        );
        const normalizedPath = relativeConstructPath.replace(/\\/g, '/');
        const packagePath = normalizedPath.startsWith('.')
          ? normalizedPath
          : `./${normalizedPath}`;
        logger.info(
          `   dotgithub construct add --name "${options.name}" --package "${packagePath}"`
        );
      } catch (error) {
        logger.error(
          '❌ Failed to create construct:',
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  const constructDescribeCommand = new Command('describe')
    .description('Describe construct information and configuration schema')
    .option('--name <name>', 'specific construct name to describe')
    .option('--format <format>', 'output format (text|markdown|json)', 'text')
    .option('--search <keyword>', 'search constructs by keyword')
    .option('--category <category>', 'filter constructs by category')
    .option('--all', 'describe all loaded constructs')
    .action(async (options) => {
      try {
        const context = createContext(options);
        const manager = new ConstructManager({
          projectRoot: context.rootPath,
          context,
        });

        const constructConfigs = context.config.constructs || [];
        if (constructConfigs.length === 0) {
          logger.info('📝 No constructs configured');
          return;
        }

        await manager.loadConstructs(constructConfigs);

        if (options.name) {
          const description = await manager.describeConstruct(options.name);
          if (!description) {
            logger.info(
              `❌ Construct "${options.name}" not found or not loaded`
            );
            process.exit(1);
          }

          switch (options.format) {
            case 'markdown':
              logger.info(generateConstructMarkdown(description));
              break;
            case 'json':
              logger.info(JSON.stringify(description, null, 2));
              break;
            default:
              logger.info(`\n🔌 Construct: ${description.name}\n`);
              logger.info(formatConstructDescription(description));
          }
        } else if (options.search) {
          const constructList = await manager.listConstructs();
          const descriptions = constructList
            .map((c) => c.description)
            .filter((desc): desc is NonNullable<typeof desc> => desc !== null);

          const searchResults = searchConstructsByKeyword(
            descriptions,
            options.search
          );

          if (searchResults.length === 0) {
            logger.info(
              `🔍 No constructs found matching "${options.search}"`
            );
            return;
          }

          logger.info(
            `🔍 Found ${searchResults.length} construct(s) matching "${options.search}":\n`
          );

          for (const description of searchResults) {
            logger.info(`\n🔌 Construct: ${description.name}\n`);
            logger.info(formatConstructDescription(description));
            logger.info('\n' + '─'.repeat(50) + '\n');
          }
        } else if (options.category) {
          const constructList = await manager.listConstructs();
          const descriptions = constructList
            .map((c) => c.description)
            .filter((desc): desc is NonNullable<typeof desc> => desc !== null);

          const categoryResults = filterConstructsByCategory(
            descriptions,
            options.category
          );

          if (categoryResults.length === 0) {
            logger.info(
              `📂 No constructs found in category "${options.category}"`
            );
            return;
          }

          logger.info(
            `📂 Found ${categoryResults.length} construct(s) in category "${options.category}":\n`
          );

          for (const description of categoryResults) {
            logger.info(`\n🔌 Construct: ${description.name}\n`);
            logger.info(formatConstructDescription(description));
            logger.info('\n' + '─'.repeat(50) + '\n');
          }
        } else if (options.all) {
          const constructList = await manager.listConstructs();

          if (constructList.length === 0) {
            logger.info('📝 No constructs loaded');
            return;
          }

          logger.info(`🔌 Loaded constructs (${constructList.length}):\n`);

          for (const { name, description } of constructList) {
            logger.info(`\n🔌 Construct: ${name}\n`);
            if (description) {
              logger.info(formatConstructDescription(description));
            } else {
              logger.info('No description available');
            }
            logger.info('\n' + '─'.repeat(50) + '\n');
          }
        } else {
          const constructList = await manager.listConstructs();

          if (constructList.length === 0) {
            logger.info('📝 No constructs loaded');
            return;
          }

          logger.info(`🔌 Available constructs (${constructList.length}):\n`);

          for (const { name, description } of constructList) {
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
            '💡 Use --name <construct> to get detailed information about a specific construct'
          );
          logger.info(
            '💡 Use --search <keyword> to search constructs by keyword'
          );
          logger.info('💡 Use --category <category> to filter by category');
          logger.info('💡 Use --all to describe all constructs');
        }
      } catch (error) {
        logger.error(
          '❌ Failed to describe constructs:',
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
          `   Constructs: ${stack.constructs.length > 0 ? stack.constructs.join(', ') : '(none)'}`
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
      '--constructs <constructs>',
      'comma-separated list of construct names'
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

        const constructs = options.constructs
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        const stackConfig: StackConfig = {
          name: options.name,
          constructs,
          config,
        };

        addStackToConfig(stackConfig, context.configPath);
        logger.info(
          `✅ Added stack "${options.name}" with constructs: ${constructs.join(', ')}`
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
  constructCommand.addCommand(constructSubCommand);
  constructCommand.addCommand(constructAddCommand);
  constructCommand.addCommand(constructRemoveCommand);
  constructCommand.addCommand(constructCreateCommand);
  constructCommand.addCommand(constructDescribeCommand);

  stackCommand.addCommand(stackListCommand);
  stackCommand.addCommand(stackAddCommand);
  stackCommand.addCommand(stackRemoveCommand);

  constructCommand.addCommand(stackCommand);

  return constructCommand;
}
