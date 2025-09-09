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
 * Updates or creates org index.ts file to export from action folders
 * @param orgDir - Organization directory path
 * @param actionName - Action name (folder name)
 */
export async function updateOrgIndexFile(orgDir: string, actionName: string): Promise<void> {
  const indexPath = path.join(orgDir, 'index.ts');
  const exportStatement = `export * from './${actionName}.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates (check for the action reference regardless of quotes)
    const exportPattern = new RegExp(`export\\s*\\*\\s*from\\s*['"]\\./${actionName}\\.js['"]`);
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
  
  // Check if org directory still has any action files
  if (fs.existsSync(orgDir)) {
    const actionFiles = fs.readdirSync(orgDir).filter(item => {
      const itemPath = path.join(orgDir, item);
      return fs.statSync(itemPath).isFile() && item.endsWith('.ts') && item !== 'index.ts';
    });
    
    if (actionFiles.length === 0) {
      // No more action files, remove the org directory
      fs.rmSync(orgDir, { recursive: true, force: true });
      
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
      // Still has action files, rebuild the org index.ts
      const orgIndexPath = path.join(orgDir, 'index.ts');
      const exportStatements = actionFiles.map(file => {
        const fileNameWithoutExt = path.basename(file, '.ts');
        return `export * from './${fileNameWithoutExt}.js';`;
      }).join('\n') + '\n';
      
      const formattedContent = await formatWithPrettier(exportStatements);
      fs.writeFileSync(orgIndexPath, formattedContent, 'utf8');
    }
  }
}