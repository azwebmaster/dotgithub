import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDefaultBranch } from './github';
import { cloneRepo } from './git';
import { readActionYml } from './action-yml';
import { generateTypesFromYml } from './typegen';
import { toProperCase } from './utils';
import * as prettier from 'prettier';

export function helloCore(): string {
  return 'Hello from @dotgithub/core!';
}

// Export types and functions that will be used by generated code
export { createStep } from './actions';
export type { GitHubStep, GitHubStepBase, GitHubWorkflow, GitHubJob } from './types/workflow';

// Export construct classes for CDK-style workflow building
export * from './constructs';

// Export GH class and types
export { GH } from './GH';
export type { DotGitHubResource, DotGitHub } from './types/common';

// Export workflow generation functions
export { generateWorkflowYaml, createWorkflow, createJob } from './workflow-generator';
export type { WorkflowGenerationOptions } from './workflow-generator';

// Export template system
export { TemplateLoader, createTemplateLoader } from './template';
export type { TemplateConfig, TemplateVariable, TemplateContext, ProcessedTemplate } from './template';

// Export template validation
export { validateTemplate, createTemplateValidator, TemplateValidator } from './template-validator';
export type { ValidationResult, ValidationError, ValidationWarning, ValidationOptions } from './template-validator';

// Export GitHub files generation
export {
  generateGithubFiles,
  generateDependabotConfig,
  generateCodeowners,
  generateIssueTemplate,
  generatePullRequestTemplate,
  generateFundingConfig,
  generateSecurityPolicy,
  GitHubFilesGenerators
} from './github-files-generator';
export type {
  GenerateGithubFilesOptions,
  GenerateGithubFilesResult,
  DependabotConfig,
  DependabotUpdate,
  CodeownersEntry,
  IssueTemplate,
  PullRequestTemplate,
  FundingConfig,
  SecurityPolicy,
  SupportedGitHubFile
} from './github-files-generator';

export interface GenerateTypesResult {
  yaml: any;
  type: string;
}

export interface GenerateActionFilesOptions {
  orgRepoRef: string;
  outputDir: string;
  token?: string;
}

export interface GenerateActionFilesResult {
  filePath: string;
  actionName: string;
  generatedTypes: string;
}

/**
 * Clones a GitHub repo, checks out a ref, reads action.yml, and generates a TypeScript type.
 * @param orgRepo e.g. 'actions/checkout'
 * @param ref tag/sha/branch (optional, defaults to default branch)
 * @param token GitHub token (optional, overrides env GITHUB_TOKEN)
 */
export async function generateTypesFromActionYml(orgRepo: string, ref?: string, token?: string): Promise<GenerateTypesResult> {
  const [owner, repo] = orgRepo.split('/');
  if (!owner || !repo) throw new Error('orgRepo must be in the form org/repo');
  token = token || process.env.GITHUB_TOKEN;

  if (!ref) {
    ref = await getDefaultBranch(owner, repo, token);
  }

  const tmpDir = createTempDir();
  await cloneRepoToTemp(owner, repo, ref, token, tmpDir);
  const yml = readActionYml(tmpDir);
  const type = generateTypesFromYml(yml, orgRepo, ref);
  cleanupTempDir(tmpDir);
  return { yaml: yml, type };
}

/**
 * Generates a GitHub Action TypeScript file from a GitHub repo and saves it to the output directory.
 * Creates an organization folder structure and updates index files.
 * @param options - Configuration for file generation
 */
export async function generateActionFiles(options: GenerateActionFilesOptions): Promise<GenerateActionFilesResult> {
  const { orgRepo, ref } = parseOrgRepoRef(options.orgRepoRef);
  const [owner, repo] = orgRepo.split('/');
  if (!owner || !repo) throw new Error('orgRepo must be in the form org/repo');
  
  const token = options.token || process.env.GITHUB_TOKEN;
  const resolvedRef = ref || await getDefaultBranch(owner, repo, token);

  // Generate the TypeScript types
  const result = await generateTypesFromActionYml(orgRepo, resolvedRef, token);
  
  // Generate filename from action name
  const actionNameForFile = generateFilenameFromActionName(result.yaml.name);
  const fileName = `${actionNameForFile}.ts`;
  
  // Create organization folder structure
  const orgDir = path.join(options.outputDir, owner);
  const filePath = path.join(orgDir, fileName);

  // Ensure organization directory exists
  fs.mkdirSync(orgDir, { recursive: true });

  // Add import statement to the generated types
  const typesWithImports = addImportsToGeneratedTypes(result.type);
  
  // Format the code with prettier
  const formattedCode = await formatWithPrettier(typesWithImports);
  
  // Write the TypeScript file
  fs.writeFileSync(filePath, formattedCode, 'utf8');

  // Update or create index.ts file in the org folder
  await updateIndexFile(orgDir, actionNameForFile);
  
  // Update or create index.ts file in the root output directory
  await updateRootIndexFile(options.outputDir, owner);

  return {
    filePath,
    actionName: actionNameForFile,
    generatedTypes: typesWithImports
  };
}

// Private helpers
function createTempDir(): string {
  return fs.mkdtempSync(os.tmpdir() + '/action-yml-');
}

async function cloneRepoToTemp(owner: string, repo: string, ref: string | undefined, token: string | undefined, tmpDir: string) {
  const url = token
    ? `https://${token}:x-oauth-basic@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;
  const cloneOptions: Record<string, any> = { '--depth': 1 };
  if (ref) cloneOptions['--branch'] = ref;
  await cloneRepo(url, tmpDir, cloneOptions);
}

function cleanupTempDir(tmpDir: string) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Formats TypeScript code using prettier
 * @param code - TypeScript code to format
 * @returns Formatted TypeScript code
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
 * Parses orgRepoRef format like "actions/checkout@v4" or "actions/checkout"
 * @param orgRepoRef - String in format org/repo@ref or org/repo
 * @returns Object with orgRepo and ref
 */
function parseOrgRepoRef(orgRepoRef: string): { orgRepo: string; ref?: string } {
  const atIndex = orgRepoRef.lastIndexOf('@');
  if (atIndex === -1) {
    return { orgRepo: orgRepoRef };
  }
  return {
    orgRepo: orgRepoRef.substring(0, atIndex),
    ref: orgRepoRef.substring(atIndex + 1)
  };
}

/**
 * Generates a filename from the action name by converting to kebab-case
 * @param actionName - The action name from action.yml
 * @returns Filename-safe string
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
 * @param generatedTypes - The generated TypeScript code
 * @returns TypeScript code with import statements
 */
function addImportsToGeneratedTypes(generatedTypes: string): string {
  const imports = `import { createStep } from '@dotgithub/core';\nimport type { GitHubStep, GitHubStepBase } from '@dotgithub/core';\n\n`;
  return imports + generatedTypes;
}

/**
 * Updates or creates index.ts file in the output directory to export the new types
 * @param outputDir - Output directory path
 * @param actionNameForFile - The filename (without extension) to export
 */
async function updateIndexFile(outputDir: string, actionNameForFile: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  const exportStatement = `export * from './${actionNameForFile}.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates (check for the file reference regardless of quotes)
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
 * @param outputDir - Root output directory path
 * @param orgName - Organization name (folder name)
 */
async function updateRootIndexFile(outputDir: string, orgName: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  const exportStatement = `export * as ${orgName} from './${orgName}/index.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates (check for the org reference regardless of quotes)
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
