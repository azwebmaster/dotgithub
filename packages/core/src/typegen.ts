
import type { GitHubActionInput, GitHubActionOutput, GitHubActionYml, GitHubInputValue } from './types';
import type { GitHubStepBase, GitHubStep, GitHubStepAction } from './types/workflow';
import type { PluginContext } from './plugins/types';
import { toProperCase } from './utils';
import { Project, SourceFile, TypeAliasDeclaration, FunctionDeclaration, JSDocTag } from 'ts-morph';



// Helpers to keep generation logic small and testable
function createLiteralFromValue(v: unknown): string {
  // GitHub Actions inputs are always strings, so convert everything to string literals
  if (v === null || v === undefined) return `""`; 
  if (typeof v === 'string') return `"${v.replace(/"/g, '\"')}"`;
  return `"${String(v)}"`; // Convert numbers, booleans, etc. to string literals
}

function needsQuoting(propertyName: string): boolean {
  // Check if property name contains special characters that require quoting
  return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propertyName);
}

function quotePropertyName(propertyName: string): string {
  return needsQuoting(propertyName) ? `"${propertyName}"` : propertyName;
}

function escapeJSDocComment(text: string): string {
  return text.replace(/\*\//g, '*\\/');
}




import type { GitHubActionInputs, GitHubActionOutputs } from './types/common';





function hasRequiredInputs(inputs?: GitHubActionInputs): boolean {
  if (!inputs) return false;
  return Object.values(inputs).some(input => input.required === true || input.required === 'true');
}

function hasRequiredInputsCheck(inputs?: GitHubActionInputs): boolean {
  if (!inputs) return false;
  return Object.values(inputs).some(input => input.required === true || input.required === 'true');
}

/**
 * Builds input members for type-safe code generation
 */
function buildInputMembers(inputs?: GitHubActionInputs): string {
  if (!inputs) return '{}';
  
  const members = Object.entries(inputs).map(([key, val]) => {
    const required = val.required === true || val.required === 'true';
    const optionalToken = required ? '' : '?';
    const quotedKey = needsQuoting(key) ? `"${key}"` : key;
    
    // Build JSDoc comment if description or default is present
    let commentParts: string[] = [];
    if (val.description) commentParts.push(escapeJSDocComment(val.description));
    if (val.default !== undefined) commentParts.push(`default: ${JSON.stringify(val.default)}`);
    
    const comment = commentParts.length > 0 ? `/** ${commentParts.join(' | ')} */\n    ` : '';
    return `${comment}${quotedKey}${optionalToken}: GitHubInputValue`;
  });
  
  return `{\n    ${members.join(';\n    ')};\n  }`;
}

/**
 * Builds output members for type-safe code generation
 */
function buildOutputMembers(outputs?: GitHubActionOutputs): string {
  if (!outputs) return '{}';
  
  const members = Object.entries(outputs).map(([key, val]) => {
    const quotedKey = needsQuoting(key) ? `"${key}"` : key;
    const comment = val.description ? `/** ${escapeJSDocComment(val.description)} */\n    ` : '';
    return `${comment}${quotedKey}: string`;
  });
  
  return `{\n    ${members.join(';\n    ')};\n  }`;
}

function createFactoryFunction(
  ActionName: string,
  actionNameCamel: string,
  repo: string,
  ref: string,
  inputs?: GitHubActionInputs
): string {
  const inputsRequired = hasRequiredInputs(inputs);
  const inputsParam = inputsRequired ? `inputs: ${ActionName}Inputs` : `inputs?: ${ActionName}Inputs`;
  return `export function ${actionNameCamel}(${inputsParam}, step?: Partial<GitHubStepBase>, ref?: string): GitHubStep<${ActionName}Inputs> {\n    return createStep("${repo}", { ...step, with: inputs }, ref ?? "${ref}");\n}`;
}



/**
 * Generates TypeScript types and a factory function for a GitHub Action from its YAML definition.
 *
 * This function creates type aliases for the action's inputs and outputs, and a strongly-typed
 * factory function to instantiate a GitHub Action step. The generated code includes JSDoc comments
 * for input/output descriptions and links to the action's repository.
 *
 * @param yml - The parsed GitHub Action YAML definition.
 * @param repo - The GitHub repository in the format `owner/repo` (default: `'actions/my-action'`).
 * @param ref - The git reference (branch, tag, or SHA) to use (default: `'main'`).
 * @param versionRef - The user-friendly version reference to use in generated code (defaults to ref if not provided).
 * @param customActionName - Custom action name to override the YAML name for type names and function names.
 * @returns A string containing the generated TypeScript code.
 *
 * @throws If the YAML definition is missing a `name` property.
 */
export function generateTypesFromYml(
  yml: GitHubActionYml,
  repo: string = 'actions/my-action',
  ref: string = 'main',
  versionRef?: string,
  customActionName?: string
): string {
  if (!yml || !yml.name) throw new Error('Action YAML must have a name');

  // Use custom action name if provided, otherwise use the action name from YAML
  const baseActionName = customActionName || yml.name;
  const actionName = baseActionName.replace(/[^a-zA-Z0-9]/g, ' ');
  const ActionName = toProperCase(actionName.replace(/\s+/g, ' '));
  const actionNameCamel = ActionName.charAt(0).toLowerCase() + ActionName.slice(1);

  // Use versionRef for user-visible parts, fallback to ref if not provided
  const displayRef = versionRef || ref;

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
  const sourceFile = project.createSourceFile(fileName);

  // Add required imports
  sourceFile.addImportDeclaration({
    moduleSpecifier: "@dotgithub/core",
    namedImports: ["createStep", "GitHubOutputValue", "GitHubAction", "ActionCollection", "StepChainBuilder"]
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: "@dotgithub/core",
    namedImports: ["GitHubStep", "GitHubStepAction", "GitHubInputValue", "PluginContext"],
    isTypeOnly: true
  });

  // Generate inputs type
  const inputsType = sourceFile.addTypeAlias({
    name: `${ActionName}Inputs`,
    isExported: true,
    type: buildInputMembers(yml.inputs as any),
  });

  // Add JSDoc comment for inputs type
  if (yml.inputs && Object.keys(yml.inputs).length > 0) {
    inputsType.addJsDoc({
      description: `Input parameters for the ${yml.name} action`,
    });
  }

  // Outputs will be generated as const object in the class declaration

  // Generate factory function with overloads for single step and chain support
  const hasRequiredInputs = hasRequiredInputsCheck(yml.inputs as any);

  // Generate outputs as const object with GitHubOutputValue instances
  let outputsConst = '';
  let outputsTypeName = 'any';
  if (yml.outputs && Object.keys(yml.outputs).length > 0) {
    const outputMembers = Object.entries(yml.outputs).map(([key, val]) => {
      const quotedKey = needsQuoting(key) ? `"${key}"` : key;
      const comment = val.description ? `  /** ${escapeJSDocComment(val.description)} */\n  ` : '';
      return `${comment}${quotedKey}: new GitHubOutputValue("${key}"),`;
    });
    
    outputsConst = `export const ${ActionName}Outputs = {\n${outputMembers.join('\n')}\n};`;
    outputsTypeName = `${ActionName}Outputs`;
  }

  // Generate class extending GitHubAction
  const classDeclaration = `
${outputsConst}

export type ${ActionName}OutputsType = typeof ${ActionName}Outputs;

export class ${ActionName} extends GitHubAction<${ActionName}Inputs, ${ActionName}OutputsType> {
  protected uses = "${repo}";
  protected fallbackRef = "${ref}";
  protected outputs = ${ActionName}Outputs;

  constructor(collection: ActionCollection) {
    super(collection);
  }
}`;

  // Add the class declaration to the source file
  sourceFile.addStatements(classDeclaration);

  return sourceFile.getFullText();
}
