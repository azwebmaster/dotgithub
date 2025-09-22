
import type { GitHubActionInput, GitHubActionOutput, GitHubActionYml, GitHubInputValue } from './types';
import type { GitHubStepBase } from './types/workflow';
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
 * @returns A string containing the generated TypeScript code.
 *
 * @throws If the YAML definition is missing a `name` property.
 */
export function generateTypesFromYml(
  yml: GitHubActionYml,
  repo: string = 'actions/my-action',
  ref: string = 'main',
  versionRef?: string
): string {
  if (!yml || !yml.name) throw new Error('Action YAML must have a name');

  const actionName = yml.name.replace(/[^a-zA-Z0-9]/g, ' ');
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

  // Generate outputs type if present
  let outputsType: TypeAliasDeclaration | undefined;
  if (yml.outputs && Object.keys(yml.outputs).length > 0) {
    outputsType = sourceFile.addTypeAlias({
      name: `${ActionName}Outputs`,
      isExported: true,
      type: buildOutputMembers(yml.outputs as any),
    });

    outputsType.addJsDoc({
      description: `Output parameters for the ${yml.name} action`,
    });
  }

  // Generate factory function
  const hasRequiredInputs = hasRequiredInputsCheck(yml.inputs as any);

  const factoryFunction = sourceFile.addFunction({
    name: actionNameCamel,
    isExported: true,
    parameters: [
      {
        name: 'inputs',
        type: `${ActionName}Inputs`,
        hasQuestionToken: !hasRequiredInputs,
      },
      {
        name: 'step',
        type: 'Partial<GitHubStepBase>',
        hasQuestionToken: true,
      },
      {
        name: 'ref',
        type: 'string',
        hasQuestionToken: true,
      },
    ],
    returnType: `GitHubStep<${ActionName}Inputs>`,
    statements: [
      `return createStep("${repo}", { ...step, with: inputs }, ref ?? "${ref}");`,
    ],
  });

  // Add JSDoc comment for factory function
  const jsDocDescription = yml.description
    ? `${escapeJSDocComment(yml.description)}\n\nhttps://github.com/${repo}/tree/${displayRef}`
    : `Factory function for the ${yml.name} action`;

  factoryFunction.addJsDoc({
    description: `${jsDocDescription}
@param inputs ${hasRequiredInputs ? 'Required input parameters' : 'Optional input parameters'}
@param step Optional step configuration overrides
@param ref Optional git reference (defaults to the version used for generation)
@returns A GitHub step configuration`,
  });

  return sourceFile.getFullText();
}
