import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDefaultBranch } from './github';
import { cloneRepo } from './git';
import { readActionYml } from './action-yml';
import { generateTypesFromYml } from './typegen';
import { toProperCase } from './utils';

export function helloCore(): string {
  return 'Hello from @dotgithub/core!';
}

// Export types and functions that will be used by generated code
export { createStep } from './actions';
export type { GitHubStep } from './types/workflow';

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
 * Also updates the index.ts file in the output directory to export the new types.
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
  const filePath = path.join(options.outputDir, fileName);

  // Ensure output directory exists
  fs.mkdirSync(options.outputDir, { recursive: true });

  // Add import statement to the generated types
  const typesWithImports = addImportsToGeneratedTypes(result.type);
  
  // Write the TypeScript file
  fs.writeFileSync(filePath, typesWithImports, 'utf8');

  // Update or create index.ts file
  updateIndexFile(options.outputDir, actionNameForFile);

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
  const imports = `import { GitHubStep, createStep } from '@dotgithub/core';\n\n`;
  return imports + generatedTypes;
}

/**
 * Updates or creates index.ts file in the output directory to export the new types
 * @param outputDir - Output directory path
 * @param actionNameForFile - The filename (without extension) to export
 */
function updateIndexFile(outputDir: string, actionNameForFile: string): void {
  const indexPath = path.join(outputDir, 'index.ts');
  const exportStatement = `export * from './${actionNameForFile}.js';\n`;
  
  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, 'utf8');
    // Check if the export already exists to avoid duplicates
    if (!existingContent.includes(`export * from './${actionNameForFile}.js'`)) {
      fs.appendFileSync(indexPath, exportStatement);
    }
  } else {
    fs.writeFileSync(indexPath, exportStatement, 'utf8');
  }
}
