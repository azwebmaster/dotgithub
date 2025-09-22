import { Command } from 'commander';
import { readConfig, getActionsFromConfigWithResolvedPaths, generateTypesFromActionYml, type DotGithubContext } from '@dotgithub/core';
import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
import { minimatch } from 'minimatch';

export function createRegenerateCommand(createContext: (options?: any) => DotGithubContext): Command {
  return new Command('regenerate')
    .argument('[pattern]', 'Optional glob pattern to filter actions (e.g., "actions/*" or "*/checkout")')
    .description('Regenerate TypeScript files based on the config')
    .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)')
    .option('--prune', 'Remove orphaned files not defined in config')
    .action(async (pattern: string | undefined, options) => {
      try {
        const config = readConfig();
        let actions = getActionsFromConfigWithResolvedPaths();

        // Filter actions based on pattern if provided
        if (pattern) {
          actions = actions.filter(action => minimatch(action.orgRepo, pattern));
          if (actions.length === 0) {
            console.log(`No actions match pattern "${pattern}"`);
            return;
          }
          console.log(`Found ${actions.length} action(s) matching pattern "${pattern}"`);
        } else {
          if (actions.length === 0) {
            console.log('No actions found in config file');
            return;
          }
        }

        console.log(`Regenerating ${actions.length} action(s)...`);

        // Track all files that should exist (for pruning, we need ALL files from config, not just filtered ones)
        const allActions = getActionsFromConfigWithResolvedPaths();
        const expectedFiles = new Set<string>();
        const generatedIndexFiles = new Set<string>();
        
        // Pre-populate expected files from ALL actions in config (for accurate pruning)
        if (options.prune) {
          for (const action of allActions) {
            try {
              const [owner] = action.orgRepo.split('/');
              const outputDir = config.outputDir;
              const orgDir = path.join(outputDir, owner!);
              
              // We need to calculate what the filename should be
              // For pruning purposes, we'll use a simplified approach and just track the output paths from config
              if (fs.existsSync(action.resolvedOutputPath)) {
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

        // Regenerate each action
        for (const action of actions) {
          try {
            console.log(`Regenerating ${action.orgRepo}...`);

            // Generate the TypeScript types using the stored refs
            const result = await generateTypesFromActionYml(
              action.orgRepo,
              action.ref,
              options.token,
              action.versionRef
            );

            // Generate filename from action name
            const actionNameForFile = generateFilenameFromActionName(result.yaml.name);
            const fileName = `${actionNameForFile}.ts`;

            // Determine output path
            const [owner] = action.orgRepo.split('/');
            const outputDir = config.outputDir;
            const orgDir = path.join(outputDir, owner!); // Non-null assertion since split('/') will always have at least one element
            const filePath = path.join(orgDir, fileName);

            // Ensure organization directory exists
            fs.mkdirSync(orgDir, { recursive: true });

            // Add import statement to the generated types
            const typesWithImports = addImportsToGeneratedTypes(result.type);

            // Format the code with prettier
            const formattedCode = await formatWithPrettier(typesWithImports);

            // Write the TypeScript file
            fs.writeFileSync(filePath, formattedCode, 'utf8');

            // Track expected files
            expectedFiles.add(path.resolve(filePath));

            // Update index files
            await updateIndexFile(orgDir, actionNameForFile);
            generatedIndexFiles.add(path.join(orgDir, 'index.ts'));

            // Update root index file
            await updateRootIndexFile(outputDir, owner!);
            generatedIndexFiles.add(path.join(outputDir, 'index.ts'));

            console.log(`  ✓ Generated ${path.relative(process.cwd(), filePath)}`);
          } catch (error) {
            console.error(`  ✗ Failed to regenerate ${action.orgRepo}: ${error instanceof Error ? error.message : error}`);
          }
        }

        // Clean up orphaned files only if --prune flag is provided
        if (options.prune) {
          await cleanupOrphanedFiles(config.outputDir, expectedFiles, generatedIndexFiles);
        }

        console.log(`Successfully regenerated ${actions.length} action(s)${options.prune ? ' and cleaned up orphaned files' : ''}`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
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
 * Adds necessary import statements to the generated TypeScript code
 */
function addImportsToGeneratedTypes(generatedTypes: string): string {
  const imports = `import { createStep } from '@dotgithub/core';\nimport type { GitHubStep, GitHubStepBase, GitHubInputValue } from '@dotgithub/core';\n\n`;
  return imports + generatedTypes;
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
 * Updates or creates index.ts file in the output directory to export the new types
 */
async function updateIndexFile(outputDir: string, actionNameForFile: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  const exportStatement = `export * from './${actionNameForFile}.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates
    if (!existingContent.includes(`./${actionNameForFile}.js`)) {
      const newContent = existingContent + exportStatement;
      const formattedContent = await formatWithPrettier(newContent);
      fs.writeFileSync(indexPath, formattedContent, 'utf8');
    }
  } else {
    const formattedContent = await formatWithPrettier(exportStatement);
    fs.writeFileSync(indexPath, formattedContent, 'utf8');
  }
}

/**
 * Updates or creates root index.ts file to export from organization folders
 */
async function updateRootIndexFile(outputDir: string, orgName: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  const exportStatement = `export * as ${orgName} from './${orgName}/index.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates
    if (!existingContent.includes(`export * as ${orgName} from`)) {
      const newContent = existingContent + exportStatement;
      const formattedContent = await formatWithPrettier(newContent);
      fs.writeFileSync(indexPath, formattedContent, 'utf8');
    }
  } else {
    const formattedContent = await formatWithPrettier(exportStatement);
    fs.writeFileSync(indexPath, formattedContent, 'utf8');
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

  console.log('Cleaning up orphaned files...');
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
        console.log(`  ✓ Removed orphaned file: ${path.relative(process.cwd(), file)}`);
        removedCount++;
      } catch (error) {
        console.warn(`  ⚠ Failed to remove ${file}: ${error instanceof Error ? error.message : error}`);
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
        console.log(`  ✓ Removed empty directory: ${path.relative(process.cwd(), dir)}`);
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
    console.log(`Removed ${removedCount} orphaned file(s) and/or directory(ies)`);
  } else {
    console.log('No orphaned files found');
  }
}