import { Command } from 'commander';
import {
  readConfig,
  getActionsFromConfigWithResolvedPaths,
  generateTypesFromActionYml,
  type DotGithubContext,
  logger,
  addImportsToGeneratedTypes,
  updateRootIndexFile,
  generateActionsConstructClass,
  toProperCase,
} from '@dotgithub/core';
import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
import { minimatch } from 'minimatch';

export function createRegenerateCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  return new Command('regenerate')
    .argument(
      '[pattern]',
      'Optional glob pattern to filter actions (e.g., "actions/*" or "*/checkout")'
    )
    .description('Regenerate TypeScript files based on the config')
    .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)')
    .option('--prune', 'Remove orphaned files not defined in config')
    .action(async (pattern: string | undefined, options) => {
      try {
        const context = createContext(options);
        const config = context.config;
        let actions = context.config.actions.map((action) => ({
          ...action,
          ...(action.outputPath && {
            resolvedOutputPath: context.resolvePath(action.outputPath),
          }),
        }));

        // Filter actions based on pattern if provided
        if (pattern) {
          actions = actions.filter((action) =>
            minimatch(action.orgRepo, pattern)
          );
          if (actions.length === 0) {
            logger.info(`No actions match pattern "${pattern}"`);
            return;
          }
          logger.info(
            `Found ${actions.length} action(s) matching pattern "${pattern}"`
          );
        } else {
          if (actions.length === 0) {
            logger.info('No actions found in config file');
            return;
          }
        }

        logger.info(`Regenerating ${actions.length} action(s)...`);

        // Track all files that should exist (for pruning, we need ALL files from config, not just filtered ones)
        const allActions = context.config.actions.map((action) => ({
          ...action,
          ...(action.outputPath && {
            resolvedOutputPath: context.resolvePath(action.outputPath),
          }),
        }));
        const expectedFiles = new Set<string>();
        const generatedIndexFiles = new Set<string>();

        // Pre-populate expected files from ALL actions in config (for accurate pruning)
        if (options.prune) {
          for (const action of allActions) {
            try {
              const [owner] = action.orgRepo.split('/');
              const outputDir = context.rootPath;
              const orgDir = path.join(outputDir, owner!);

              // We need to calculate what the filename should be
              // For pruning purposes, we'll use a simplified approach and just track the output paths from config
              if (
                action.resolvedOutputPath &&
                fs.existsSync(action.resolvedOutputPath)
              ) {
                expectedFiles.add(path.resolve(action.resolvedOutputPath));
              }

              // Also track potential index files
              generatedIndexFiles.add(path.join(orgDir, 'index.ts'));
              generatedIndexFiles.add(path.join(outputDir, 'index.ts'));
            } catch (error) {
              // Ignore errors when calculating expected files for pruning
            }
          }
        }

        // Regenerate each action file
        for (const action of actions) {
          try {
            logger.info(`Regenerating ${action.orgRepo}...`);

            // Generate the TypeScript types using the stored refs
            const result = await generateTypesFromActionYml(
              action.orgRepo,
              action.ref,
              options.token,
              action.versionRef,
              action.actionName,
              action.actionPath
            );

            // Use the existing outputPath from config
            const filePath = context.resolvePath(action.outputPath!);

            // Ensure directory exists
            const outputDir = path.dirname(filePath);
            fs.mkdirSync(outputDir, { recursive: true });

            // Add import statement to the generated types
            const typesWithImports = addImportsToGeneratedTypes(result.type);

            // Format the code with prettier
            const formattedCode = await formatWithPrettier(typesWithImports);

            // Write the TypeScript file
            fs.writeFileSync(filePath, formattedCode, 'utf8');

            // Track expected files
            expectedFiles.add(path.resolve(filePath));

            logger.info(
              `  ✓ Generated ${path.relative(process.cwd(), filePath)}`
            );
          } catch (error) {
            logger.error(
              `  ✗ Failed to regenerate ${action.orgRepo}: ${error instanceof Error ? error.message : error}`
            );
          }
        }

        // Regenerate org index files using the same logic as the add command
        // Use all actions from config, not just the filtered ones
        const processedOrgs = new Set<string>();
        for (const action of context.config.actions) {
          const [owner] = action.orgRepo.split('/');
          if (!processedOrgs.has(owner!)) {
            processedOrgs.add(owner!);

            // Get all actions for this organization from the config
            const allOrgActions = context.config.actions.filter(
              (configAction) => {
                const [configOwner] = configAction.orgRepo.split('/');
                return configOwner === owner;
              }
            );

            if (allOrgActions.length > 0) {
              // Generate the ActionsConstruct class for this organization
              await generateActionsConstructForOrg(
                context,
                owner!,
                allOrgActions
              );
              logger.info(`  ✓ Regenerated org index for ${owner}`);
            }
          }
        }

        // Clean up orphaned files only if --prune flag is provided
        if (options.prune) {
          await cleanupOrphanedFiles(
            context.rootPath,
            expectedFiles,
            generatedIndexFiles
          );
        }

        logger.info(
          `Successfully regenerated ${actions.length} action(s)${options.prune ? ' and cleaned up orphaned files' : ''}`
        );
      } catch (err) {
        logger.error('Regeneration failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
      }
    });
}

/**
 * Generates a filename from the action name by converting to kebab-case
 */
function generateFilenameFromActionName(actionName: string): string {
  if (!actionName) throw new Error('Action name is required');
  // Convert to kebab-case by replacing non-alphanumeric with hyphens and lowercase
  return actionName
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
}

/**
 * Formats TypeScript code using prettier
 */
async function formatWithPrettier(code: string): Promise<string> {
  try {
    return await prettier.format(code, {
      parser: 'typescript',
    });
  } catch (error) {
    console.warn('Failed to format code with prettier:', error);
    return code; // Return original code if formatting fails
  }
}

/**
 * Removes files in the output directory that are not tracked in the config
 */
async function cleanupOrphanedFiles(
  outputDir: string,
  expectedFiles: Set<string>,
  generatedIndexFiles: Set<string>
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    return;
  }

  logger.info('Cleaning up orphaned files...');
  let removedCount = 0;

  // Find all TypeScript files in the output directory
  const findTsFiles = (dir: string): string[] => {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findTsFiles(fullPath));
      } else if (item.endsWith('.ts')) {
        files.push(path.resolve(fullPath));
      }
    }

    return files;
  };

  const allTsFiles = findTsFiles(outputDir);

  for (const file of allTsFiles) {
    const isExpected = expectedFiles.has(file);
    const isGeneratedIndex = generatedIndexFiles.has(file);

    if (!isExpected && !isGeneratedIndex) {
      try {
        fs.unlinkSync(file);
        logger.info(
          `  ✓ Removed orphaned file: ${path.relative(process.cwd(), file)}`
        );
        removedCount++;
      } catch (error) {
        console.warn(
          `  ⚠ Failed to remove ${file}: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  }

  // Clean up empty directories
  const cleanupEmptyDirs = (dir: string): void => {
    if (!fs.existsSync(dir) || dir === outputDir) {
      return;
    }

    try {
      const items = fs.readdirSync(dir);

      // Recursively clean subdirectories first
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          cleanupEmptyDirs(fullPath);
        }
      }

      // Check if directory is empty now
      const remainingItems = fs.readdirSync(dir);
      if (remainingItems.length === 0) {
        fs.rmdirSync(dir);
        logger.info(
          `  ✓ Removed empty directory: ${path.relative(process.cwd(), dir)}`
        );
        removedCount++;
      }
    } catch (error) {
      // Ignore errors when cleaning up directories
    }
  };

  // Clean up empty organization directories
  for (const item of fs.readdirSync(outputDir)) {
    const fullPath = path.join(outputDir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      cleanupEmptyDirs(fullPath);
    }
  }

  if (removedCount > 0) {
    logger.info(
      `Removed ${removedCount} orphaned file(s) and/or directory(ies)`
    );
  } else {
    logger.info('No orphaned files found');
  }
}

/**
 * Generates an ActionsConstruct class for an organization based on generated actions
 */
async function generateActionsConstructForOrg(
  context: DotGithubContext,
  orgName: string,
  allOrgActions: any[]
): Promise<void> {
  const rootActionDir = context.resolvePath('actions');

  if (allOrgActions.length === 0) {
    return;
  }

  // Group actions by organization and collect action metadata
  const orgActions = allOrgActions
    .map((action) => {
      // Skip actions without outputPath
      if (!action.outputPath) {
        logger.warn(`Action ${action.orgRepo} has no outputPath, skipping`);
        return null;
      }

      // Extract action metadata from the generated action files
      const actionFilePath = context.resolvePath(action.outputPath);
      if (!fs.existsSync(actionFilePath)) {
        logger.warn(`Action file not found: ${actionFilePath}`);
        return null;
      }

      // Read the action file to extract metadata
      const actionContent = fs.readFileSync(actionFilePath, 'utf8');

      // Extract action name from the file content
      const actionNameMatch = actionContent.match(
        /export class (\w+) extends ActionConstruct/
      );
      const ActionName = actionNameMatch
        ? actionNameMatch[1]
        : action.actionName;

      // Extract inputs type name
      const inputsTypeMatch = actionContent.match(/export type (\w+Inputs)/);
      const inputsType = inputsTypeMatch
        ? inputsTypeMatch[1]
        : `${ActionName}Inputs`;

      // Extract outputs type name
      const outputsTypeMatch = actionContent.match(
        /export type (\w+OutputsType)/
      );
      const outputsType = outputsTypeMatch
        ? outputsTypeMatch[1]
        : `${ActionName}OutputsType`;

      // Extract uses and fallbackRef from the class
      const usesMatch = actionContent.match(
        /protected readonly uses = "([^"]+)"/
      );
      const refMatch = actionContent.match(
        /protected readonly fallbackRef = "([^"]+)"/
      );

      const uses = usesMatch ? usesMatch[1] : action.orgRepo;
      const ref = refMatch ? refMatch[1] : action.ref || 'main';

      // Extract filename from outputPath and construct relative path
      const filename = path.basename(action.outputPath, '.ts');

      // Use stored actionName if available, otherwise fall back to calculation
      let actionName: string;

      if (action.actionName) {
        // Use the stored actionName, but sanitize it for method names (handles legacy actions with spaces)
        // Check if the actionName is already in camelCase format (no spaces, starts with lowercase)
        if (
          !action.actionName.includes(' ') &&
          /^[a-z]/.test(action.actionName)
        ) {
          // Already in camelCase format, convert to PascalCase for class name
          actionName =
            action.actionName.charAt(0).toUpperCase() +
            action.actionName.slice(1);
        } else {
          // Legacy format with spaces, convert to PascalCase
          actionName = action.actionName
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          actionName = actionName
            .split(' ')
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join('');
        }
      } else {
        // Fallback to calculation for legacy actions without stored actionName
        actionName = ActionName || 'unknown';

        // For actions with actionPath, create a unique method name
        if (action.actionPath) {
          // Use a simple method name based on the actionPath
          // e.g., "restore" -> "cacheRestore", "save" -> "cacheSave"
          const actionPathCapitalized =
            action.actionPath.charAt(0).toUpperCase() +
            action.actionPath.slice(1);
          // Extract the base action name from the class name (remove the actionPath suffix)
          const baseActionName = ActionName.replace(
            new RegExp(`${actionPathCapitalized}$`),
            ''
          );
          actionName = `${baseActionName}${actionPathCapitalized}`;
        } else if (ActionName && filename !== ActionName.toLowerCase()) {
          // For actions with different filename than class name, use filename
          actionName = filename
            .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
            .replace(/^./, (letter) => letter.toUpperCase());
        }
      }
      const actionNameCamel =
        actionName.charAt(0).toLowerCase() + actionName.slice(1);

      // Extract description from JSDoc comment
      const descriptionMatch = actionContent.match(
        /\/\*\*\s*\n\s*\*\s*([^\n]+)/
      );
      const description =
        descriptionMatch?.[1]?.trim() || `${ActionName || actionName} action`;

      // Construct the relative import path from the org index file to the action file
      // The org index file is at actions/orgName/index.ts
      // The action file is at action.outputPath (e.g., actions/orgName/repo/action.ts)
      const orgIndexDir = path.dirname(
        path.join(rootActionDir, orgName, 'index.ts')
      );
      const actionFileDir = path.dirname(actionFilePath);
      const relativePath = path.relative(orgIndexDir, actionFileDir);

      // Construct the full import path
      const importPath =
        relativePath === ''
          ? filename
          : path.join(relativePath, filename).replace(/\\/g, '/');

      return {
        actionName,
        ActionName: ActionName || actionName,
        actionNameCamel,
        filename: importPath,
        repo: uses || action.actionPath || '',
        ref: ref || 'main',
        description,
      };
    })
    .filter((action): action is NonNullable<typeof action> => action !== null);

  if (orgActions.length === 0) {
    return;
  }

  // Generate the ActionsConstruct class
  const actionsConstructCode = generateActionsConstructClass(
    orgName,
    orgActions
  );

  // Write the ActionsConstruct file
  const orgDir = path.join(rootActionDir, orgName);
  const constructFilePath = path.join(orgDir, 'index.ts');

  // Ensure the directory exists
  if (!fs.existsSync(orgDir)) {
    fs.mkdirSync(orgDir, { recursive: true });
  }

  // Format and write the file
  const formattedContent = await formatWithPrettier(actionsConstructCode);
  fs.writeFileSync(constructFilePath, formattedContent, 'utf8');

  logger.debug(
    `Generated ActionsConstruct for ${orgName} organization at ${constructFilePath}`
  );
}
