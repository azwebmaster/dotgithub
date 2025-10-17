import type {
  GitHubActionInput,
  GitHubActionOutput,
  GitHubActionYml,
  GitHubInputValue,
} from './types/common.js';
import type {
  GitHubStepBase,
  GitHubStep,
  GitHubStepAction,
} from './types/workflow.js';
import type { GitHubStack } from './constructs/base.js';
import type { ActionConstructProps } from './constructs/action.js';
import { toProperCase } from './utils.js';
import {
  Project,
  SourceFile,
  TypeAliasDeclaration,
  FunctionDeclaration,
  JSDocTag,
} from 'ts-morph';

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

import type {
  GitHubActionInputs,
  GitHubActionOutputs,
} from './types/common.js';

function hasRequiredInputs(inputs?: GitHubActionInputs): boolean {
  if (!inputs) return false;
  return Object.values(inputs).some(
    (input) => input.required === true || input.required === 'true'
  );
}

function hasRequiredInputsCheck(inputs?: GitHubActionInputs): boolean {
  if (!inputs) return false;
  return Object.values(inputs).some(
    (input) => input.required === true || input.required === 'true'
  );
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
    if (val.default !== undefined)
      commentParts.push(`default: ${JSON.stringify(val.default)}`);

    const comment =
      commentParts.length > 0 ? `/** ${commentParts.join(' | ')} */\n    ` : '';
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
    const comment = val.description
      ? `/** ${escapeJSDocComment(val.description)} */\n    `
      : '';
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
  const inputsParam = inputsRequired
    ? `inputs: ${ActionName}Inputs`
    : `inputs?: ${ActionName}Inputs`;
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
  customActionName?: string,
  actionPath?: string
): string {
  if (!yml || !yml.name) throw new Error('Action YAML must have a name');

  // Use custom action name if provided, otherwise use the action name from YAML
  const baseActionName = customActionName || yml.name;
  let actionName = baseActionName.replace(/[^a-zA-Z0-9]/g, ' ');

  // If actionPath is provided, append it to create unique class names
  if (actionPath) {
    const pathName = actionPath.replace(/[^a-zA-Z0-9]/g, ' ');
    actionName = `${actionName} ${pathName}`;
  }

  const ActionName = toProperCase(actionName.replace(/\s+/g, ' '));
  const actionNameCamel =
    ActionName.charAt(0).toLowerCase() + ActionName.slice(1);

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

  // Outputs will be generated as const object in the class declaration

  // Generate factory function with overloads for single step and chain support
  const hasRequiredInputs = hasRequiredInputsCheck(yml.inputs as any);

  // Generate outputs as const object with GitHubOutputValue instances
  let outputsConst = '';
  let outputsTypeName = '{}';
  if (yml.outputs && Object.keys(yml.outputs).length > 0) {
    const outputMembers = Object.entries(yml.outputs).map(([key, val]) => {
      const quotedKey = needsQuoting(key) ? `"${key}"` : key;
      const comment = val.description
        ? `  /** ${escapeJSDocComment(val.description)} */\n  `
        : '';
      return `${comment}${quotedKey}: new GitHubOutputValue("${key}"),`;
    });

    outputsConst = `export const ${ActionName}Outputs = {\n${outputMembers.join('\n')}\n};`;
    outputsTypeName = `${ActionName}Outputs`;
  } else {
    outputsConst = `export const ${ActionName}Outputs = {};`;
    outputsTypeName = `${ActionName}Outputs`;
  }

  // Generate action class with proper JSDoc
  const actionDescription = yml.description
    ? escapeJSDocComment(yml.description)
    : `${ActionName} action`;
  const inputsParamDoc =
    yml.inputs && Object.keys(yml.inputs).length > 0
      ? ` * @param inputs - Input parameters for the ${yml.name} action`
      : ` * @param inputs - Input parameters (optional)`;

  // Generate GitHub repository link
  const githubLink = `https://github.com/${repo}/tree/${displayRef}`;

  const fullContent = `import { GitHubOutputValue } from "@dotgithub/core";
import type {
  GitHubStepAction,
  GitHubInputValue,
  ActionInvocationResult,
} from "@dotgithub/core";
import type { ActionCollection } from "@dotgithub/core";
import type { ActionConstructProps } from "@dotgithub/core";
import type { Construct } from "@dotgithub/core";

${sourceFile
  .getTypeAliases()
  .map((alias) => alias.getFullText())
  .join('\n')}

${outputsConst}

export type ${ActionName}OutputsType = typeof ${ActionName}Outputs;

/**
 * ${actionDescription}
 * 
 * @see {@link ${githubLink}} - GitHub repository and documentation
 */
export class ${ActionName} extends ActionConstruct<${ActionName}Inputs, ${ActionName}OutputsType> {
  protected readonly uses = "${repo}";
  protected readonly fallbackRef = "${ref}";
  protected readonly outputs = ${ActionName}Outputs;

  constructor(scope: Construct | undefined, id: string, props: ActionConstructProps<${ActionName}Inputs>) {
    super(scope, id, props);
  }
}`;

  return fullContent;
}

/**
 * Generates an ActionsConstruct class for a specific organization.
 * This creates a class that provides convenient access to all actions from an organization.
 *
 * @param orgName - The organization name (e.g., 'actions')
 * @param actions - Array of action information for this organization
 * @returns Generated TypeScript code for the ActionsConstruct class
 */
export function generateActionsConstructClass(
  orgName: string,
  actions: Array<{
    actionName: string;
    ActionName: string;
    actionNameCamel: string;
    filename: string;
    repo: string;
    ref: string;
    inputs?: GitHubActionInputs;
    outputs?: GitHubActionOutputs;
    description?: string;
  }>
): string {
  const OrgName = toProperCase(orgName);
  const className = `${OrgName}`;

  // Generate imports
  const imports = `import { ActionsConstruct } from "@dotgithub/core";
import type {
  Construct,
  GitHubStepAction,
} from "@dotgithub/core";`;

  // Generate action imports (deduplicated by filename to handle same class names)
  const uniqueImports = new Map<string, string>();
  const classAliases = new Map<string, string>();

  // First pass: collect all unique class names and create aliases
  const classCounts = new Map<string, number>();
  actions.forEach((action) => {
    const count = classCounts.get(action.ActionName) || 0;
    classCounts.set(action.ActionName, count + 1);
  });

  // Second pass: create aliases for duplicate class names
  actions.forEach((action) => {
    const count = classCounts.get(action.ActionName) || 0;
    if (count > 1) {
      // Create unique alias using actionNameCamel
      const alias =
        action.actionNameCamel.charAt(0).toUpperCase() +
        action.actionNameCamel.slice(1);
      classAliases.set(`${action.ActionName}:${action.actionNameCamel}`, alias);
    } else {
      classAliases.set(
        `${action.ActionName}:${action.actionNameCamel}`,
        action.ActionName
      );
    }
  });

  // Third pass: generate imports
  actions.forEach((action) => {
    const importKey = action.filename;
    if (!uniqueImports.has(importKey)) {
      const alias =
        classAliases.get(`${action.ActionName}:${action.actionNameCamel}`) ||
        action.ActionName;
      const inputsType = `${alias}Inputs`;

      uniqueImports.set(
        importKey,
        `import { ${action.ActionName} as ${alias}, type ${action.ActionName}Inputs as ${inputsType} } from "./${action.filename}.js";`
      );
    }
  });
  const actionImports = Array.from(uniqueImports.values()).join('\n');

  // Generate class methods (deduplicated by actionNameCamel)
  const uniqueMethods = new Map<string, string>();
  actions.forEach((action) => {
    if (!uniqueMethods.has(action.actionNameCamel)) {
      const inputsRequired = hasRequiredInputs(action.inputs);

      // Get the correct class alias
      const className =
        classAliases.get(`${action.ActionName}:${action.actionNameCamel}`) ||
        action.ActionName;
      const inputsType = `${className}Inputs`;
      const inputsParam = inputsRequired
        ? `inputs: ${inputsType}`
        : `inputs?: ${inputsType}`;

      const method = `  /**
   * ${action.description || `${action.ActionName} action`}
   * 
   * @param name The name of the step
   * @param inputs ${inputsRequired ? 'Required input parameters' : 'Optional input parameters'}
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A ${className} instance
   */
  public ${action.actionNameCamel} = (
    name: string,
    ${inputsParam},
    stepOptions?: Partial<Omit<GitHubStepAction, "uses" | "with" | "name">>,
    ref?: string
  ): ${className} => {
    return this.createActionConstruct(
      ${className},
      "${action.ActionName}",
      { inputs, stepOptions: { name, ...stepOptions }, ref }
    );
  }`;
      uniqueMethods.set(action.actionNameCamel, method);
    }
  });
  const methods = Array.from(uniqueMethods.values()).join('\n\n');

  // Generate the full class
  const fullContent = `${imports}

${actionImports}

/**
 * ${OrgName} organization actions.
 * Provides convenient access to all actions from the ${orgName} organization.
 * 
 * Usage:
 * \`\`\`typescript
 * const ${orgName} = new ${className}(stack, "${orgName}");
 * const checkoutStep = ${orgName}.checkout("Checkout code", { inputs: {...} }).toStep();
 * \`\`\`
 */
export class ${className} extends ActionsConstruct {
  constructor(
    scope: Construct | undefined,
    id: string
  ) {
    super(scope, id);
  }

${methods}
}`;

  return fullContent;
}
