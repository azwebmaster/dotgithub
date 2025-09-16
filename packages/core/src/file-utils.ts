import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';

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

  // Check if this is a single action file (repo.ts) or a folder with multiple actions
  const singleActionFile = path.join(orgDir, `${repoName}.ts`);
  const repoFolder = path.join(orgDir, repoName);

  let exportStatement: string;
  if (fs.existsSync(singleActionFile)) {
    // Single action at root - export from file directly
    exportStatement = `export * as ${sanitizeVarName(repoName)} from './${repoName}.js';\n`;
  } else if (fs.existsSync(repoFolder)) {
    // Multiple actions or subdirectory action - export from folder index
    exportStatement = `export * as ${sanitizeVarName(repoName)} from './${repoName}/index.js';\n`;
  } else {
    // Neither exists, skip
    return;
  }

  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates (handle both file and folder exports)
    const fileExportPattern = new RegExp(`export\\s*\\*\\s*as\\s*${sanitizeVarName(repoName)}\\s*from\\s*['"]\\./${repoName}(\\.js)?['"]`);
    const folderExportPattern = new RegExp(`export\\s*\\*\\s*as\\s*${sanitizeVarName(repoName)}\\s*from\\s*['"]\\./${repoName}/index\\.js['"]`);
    if (!fileExportPattern.test(existingContent) && !folderExportPattern.test(existingContent)) {
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
 * @param outputDir - Root output directory path
 * @param orgName - Organization name (folder name)
 */
export async function updateRootIndexFile(outputDir: string, orgName: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  const exportStatement = `export * as ${orgName} from './${orgName}/index.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates (check for the org reference regardless of quotes)
    const exportPattern = new RegExp(`export\\s*\\*\\s*as\\s*${orgName}\\s*from\\s*['"]\\./${orgName}/index\\.js['"]`);
    if (!exportPattern.test(existingContent)) {
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