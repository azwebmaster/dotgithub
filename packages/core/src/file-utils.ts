import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';

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
    const className = action.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toUpperCase());
    return `import { ${className} } from "./${action}.js";`;
  }).join('\n');
  
  const methodAssignments = actions.map(action => {
    const className = action.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toUpperCase());
    const methodName = action.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toLowerCase());
    return `  ${methodName}(id: string, props: ActionConstructProps<any>) {
    return this.createActionConstruct(${className}, id, props);
  }`;
  }).join('\n\n');
  
  return `import { ActionCollection } from '@dotgithub/core';
import type { ActionConstructProps } from '@dotgithub/core';
${imports}

export class ${toPascalCase(orgName)}Collection extends ActionCollection {
${methodAssignments}
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
  const exportMatches = indexContent.match(/export\s+class\s+(\w+)\s+extends\s+ActionConstruct/g);
  if (!exportMatches) {
    return '';
  }
  
  const methodAssignments = exportMatches.map(match => {
    const nameMatch = match.match(/export\s+class\s+(\w+)\s+extends\s+ActionConstruct/);
    if (!nameMatch || !nameMatch[1]) return '';
    const className = nameMatch[1];
    const methodName = className.replace(/^./, letter => letter.toLowerCase());
    return `  ${methodName}(id: string, props: ActionConstructProps<any>) {
    return this.createActionConstruct(${className}, id, props);
  }`;
  }).join('\n\n');
  
  return methodAssignments;
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
    const functionName = repoName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, letter => letter.toLowerCase());
    exportStatement = `import { ActionCollection } from '@dotgithub/core';
import { ${functionName} } from './${repoName}.js';

export class ${toPascalCase(orgName)}Collection extends ActionCollection {
  ${functionName} = ${functionName}.bind(this);
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
  const exportStatement = `export * from './${orgName}/index.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates
    const exportPattern = new RegExp(`export\\s*\\*\\s*from\\s*['"]\\./${orgName}/index\\.js['"]`);
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
          !line.includes(`export * from './${orgName}/index.js'`)
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

/**
 * Adds necessary import statements to the generated TypeScript code and removes unused imports
 * @param generatedTypes - The generated TypeScript code
 * @returns TypeScript code with only necessary import statements
 */
export function addImportsToGeneratedTypes(generatedTypes: string): string {
  // Create a new ts-morph project for code generation
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 5, // ES2022
      module: 1, // CommonJS
      declaration: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
  });

  const fileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, generatedTypes);

  // Remove all existing import declarations to avoid duplicates
  const existingImports = sourceFile.getImportDeclarations();
  existingImports.forEach(importDecl => importDecl.remove());

  // Analyze the generated code to determine which imports are actually used
  const usedImports = analyzeUsedImports(sourceFile);

  // Add all value imports together (these are used as values, not type-only)
  const valueImports = [];
  if (usedImports.has('GitHubOutputValue')) {
    valueImports.push('GitHubOutputValue');
  }
  if (usedImports.has('GitHubAction')) {
    valueImports.push('GitHubAction');
  }
  if (usedImports.has('ActionConstruct')) {
    valueImports.push('ActionConstruct');
  }
  
  if (valueImports.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: valueImports,
    });
  }

  // Add type-only imports that are used
  const typeImports = ['GitHubStep', 'GitHubStepBase', 'GitHubStepAction', 'GitHubInputValue', 'ActionInvocationResult', 'DotGithubConfig', 'PluginContext', 'ActionConstructProps', 'Construct'];
  const usedTypeImports = typeImports.filter(imp => usedImports.has(imp));
  
  if (usedTypeImports.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: usedTypeImports,
      isTypeOnly: true,
    });
  }

  if (usedImports.has('StepChainBuilder')) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: ['StepChainBuilder'],
      isTypeOnly: true,
    });
  }

  if (usedImports.has('ActionCollection')) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: ['ActionCollection'],
      isTypeOnly: true,
    });
  }

  return sourceFile.getFullText();
}

/**
 * Analyzes a TypeScript source file to determine which imports are actually used
 * @param sourceFile - The TypeScript source file to analyze
 * @returns Set of import names that are actually used in the code
 */
function analyzeUsedImports(sourceFile: SourceFile): Set<string> {
  const usedImports = new Set<string>();
  
  // Get all identifiers in the source file
  const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
  
  for (const identifier of identifiers) {
    const text = identifier.getText();
    
    // Check if this identifier matches any of our potential imports
    const potentialImports = [
      'GitHubStep',
      'GitHubStepBase', 
      'GitHubStepAction',
      'GitHubInputValue',
      'GitHubAction',
      'GitHubOutputValue',
      'ActionInvocationResult',
      'DotGithubConfig',
      'PluginContext',
      'StepChainBuilder',
      'ActionCollection',
      'ActionConstruct',
      'ActionConstructProps',
      'Construct'
    ];
    
    if (potentialImports.includes(text)) {
      usedImports.add(text);
    }
  }
  
  return usedImports;
}