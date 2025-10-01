import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';

/**
 * Converts a string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}


/**
 * Gets all actions in a directory by scanning for .ts files
 */
async function getAllActionsInDirectory(orgDir: string): Promise<string[]> {
  const actions: string[] = [];
  
  // Scan for .ts files in the org directory
  const files = fs.readdirSync(orgDir);
  for (const file of files) {
    if (file.endsWith('.ts') && file !== 'index.ts') {
      const actionName = file.replace('.ts', '');
      // Only include if the action file actually exists and has the expected exports
      const actionFilePath = path.join(orgDir, file);
      if (fs.existsSync(actionFilePath)) {
        const content = fs.readFileSync(actionFilePath, 'utf8');
        const ActionName = actionName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toUpperCase());
        // Check if the file exports the action class
        if (content.includes(`export class ${ActionName}`)) {
          actions.push(actionName);
        }
      }
    }
  }
  
  return actions;
}

/**
 * Generates a full collection class with all actions
 */
function generateFullCollectionClass(orgName: string, actions: string[]): string {
  const imports = actions.map(action => {
    const ActionName = action.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toUpperCase());
    return `import { ${ActionName} } from "./${action}.js";`;
  }).join('\n');
  
  const propertyAssignments = actions.map(action => {
    const ActionName = action.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toUpperCase());
    const propertyName = action.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return `  ${propertyName} = new ${ActionName}(this);`;
  }).join('\n');
  
  return `import { ActionCollection } from '@dotgithub/core';
${imports}

export class ${toPascalCase(orgName)}Collection extends ActionCollection {
${propertyAssignments}
}`;
}

/**
 * Generates method bindings for ActionCollection from a folder of actions
 */
async function generateActionCollectionMethods(repoFolder: string): Promise<string> {
  const indexPath = path.join(repoFolder, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    return '';
  }
  
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Extract exported class names from the index file
  const exportMatches = indexContent.match(/export\s+class\s+(\w+)/g);
  if (!exportMatches) {
    return '';
  }
  
  const propertyAssignments = exportMatches.map(match => {
    const nameMatch = match.match(/export\s+class\s+(\w+)/);
    if (!nameMatch || !nameMatch[1]) return '';
    const className = nameMatch[1];
    const propertyName = className.charAt(0).toLowerCase() + className.slice(1);
    return `  ${propertyName} = new ${className}(this);`;
  }).join('\n');
  
  return propertyAssignments;
}

/**
 * Formats TypeScript code using prettier
 * @param code - TypeScript code to format
 * @returns Formatted TypeScript code
 */
export async function formatWithPrettier(code: string): Promise<string> {
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
 * Updates or creates org index.ts file to export from repo folders or files
 * @param orgDir - Organization directory path
 * @param repoName - Repository name (folder name or file name)
 */
export async function updateOrgIndexFile(orgDir: string, repoName: string): Promise<void> {
  const indexPath = path.join(orgDir, 'index.ts');
  
  // Extract org name from the directory path
  const orgName = path.basename(orgDir);

  // Check if this is a single action file (repo.ts) or a folder with multiple actions
  const singleActionFile = path.join(orgDir, `${repoName}.ts`);
  const repoFolder = path.join(orgDir, repoName);

  let exportStatement: string;
  if (fs.existsSync(singleActionFile)) {
    // Single action at root - create ActionCollection
    const ActionName = repoName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toUpperCase());
    const propertyName = repoName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    exportStatement = `import { ActionCollection } from '@dotgithub/core';
import { ${ActionName} } from './${repoName}.js';

export class ${toPascalCase(orgName)}Collection extends ActionCollection {
  ${propertyName} = new ${ActionName}(this);
}
`;
  } else if (fs.existsSync(repoFolder)) {
    // Multiple actions or subdirectory action - create ActionCollection from folder
    exportStatement = `import { ActionCollection } from '@dotgithub/core';
import * as ${sanitizeVarName(repoName)}Actions from './${repoName}/index.js';

export class ${toPascalCase(orgName)}Collection extends ActionCollection {
  // Bind all action functions to this context
  ${await generateActionCollectionMethods(repoFolder)}
}
`;
  } else {
    // Neither exists, skip
    return;
  }

  // Always regenerate the entire collection class to include all actions
  const allActions = await getAllActionsInDirectory(orgDir);
  const fullExportStatement = generateFullCollectionClass(orgName, allActions);
  const formattedContent = await formatWithPrettier(fullExportStatement);
  fs.writeFileSync(indexPath, formattedContent, 'utf8');
}

/**
 * Updates or creates root index.ts file to export from organization folders
 * @param outputDir - Root output directory path
 * @param orgName - Organization name (folder name)
 */
export async function updateRootIndexFile(outputDir: string, orgName: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  // Convert org name to valid TypeScript identifier (replace hyphens with underscores)
  const validOrgName = orgName.replace(/-/g, '_');
  const exportStatement = `export { ${toPascalCase(orgName)}Collection } from './${orgName}/index.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the ActionCollection export already exists to avoid duplicates
    const actionCollectionPattern = new RegExp(`export\\s*{\\s*${toPascalCase(orgName)}Collection`);
    if (!actionCollectionPattern.test(existingContent)) {
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
 * Updates index files after removing an action
 * @param outputDir - Root output directory path
 * @param orgName - Organization name (folder name)
 */
export async function updateIndexFilesAfterRemoval(outputDir: string, orgName: string): Promise<void> {
  const orgDir = path.join(outputDir, orgName);

  // Check if org directory still has any repos
  if (fs.existsSync(orgDir)) {
    const items = fs.readdirSync(orgDir);

    // Find repo directories and single action files
    const repoDirs = items.filter(item => {
      const itemPath = path.join(orgDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    const repoFiles = items.filter(item => {
      return item.endsWith('.ts') && item !== 'index.ts';
    });

    if (repoDirs.length === 0 && repoFiles.length === 0) {
      // No more repo directories or files, remove the org directory
      const indexPath = path.join(orgDir, 'index.ts');
      if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
      if (fs.readdirSync(orgDir).length === 0) {
        fs.rmdirSync(orgDir);
      }

      // Update root index.ts to remove this org export
      const rootIndexPath = path.join(outputDir, 'index.ts');
      if (fs.existsSync(rootIndexPath)) {
        const content = fs.readFileSync(rootIndexPath, 'utf8');
        const lines = content.split('\n');
        const filteredLines = lines.filter(line =>
          !line.includes(`export * as ${orgName} from`)
        );
        const newContent = filteredLines.join('\n');
        const formattedContent = await formatWithPrettier(newContent);
        fs.writeFileSync(rootIndexPath, formattedContent, 'utf8');
      }
    } else {
      // Still has repo directories or files, rebuild the org index.ts
      const orgIndexPath = path.join(orgDir, 'index.ts');
      const exportStatements: string[] = [];

      // Add exports for directories
      for (const repoDir of repoDirs) {
        exportStatements.push(`export * as ${sanitizeVarName(repoDir)} from './${repoDir}/index.js';`);
      }

      // Add exports for single action files
      for (const repoFile of repoFiles) {
        const repoName = repoFile.replace('.ts', '');
        exportStatements.push(`export * as ${sanitizeVarName(repoName)} from './${repoName}.js';`);
      }

      const content = exportStatements.join('\n') + '\n';
      const formattedContent = await formatWithPrettier(content);
      fs.writeFileSync(orgIndexPath, formattedContent, 'utf8');
    }
  }
}

/**
 * Sanitizes a name to be a valid JavaScript variable name
 */
export function sanitizeVarName(name: string): string {
  // Convert kebab-case and other special characters to camelCase
  let result = '';
  let capitalizeNext = false;

  for (let i = 0; i < name.length; i++) {
    const char = name[i];

    // Valid JavaScript identifier characters
    if (char && /[a-zA-Z0-9_$]/.test(char)) {
      if (capitalizeNext && /[a-zA-Z]/.test(char)) {
        result += char.toUpperCase();
        capitalizeNext = false;
      } else {
        result += char;
      }
    } else {
      // Invalid character - mark next valid letter for capitalization
      capitalizeNext = true;
    }
  }

  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }

  // Ensure it's not empty
  if (!result || result === '_') {
    result = 'action';
  }

  return result;
}