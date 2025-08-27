
import type { GitHubActionInput, GitHubActionOutput, GitHubActionYml } from './types';
import { toProperCase } from './utils';



// Helpers to keep generation logic small and testable
function createLiteralFromValue(v: unknown): string {
  if (typeof v === 'string') return `"${v.replace(/"/g, '\"')}"`;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `"${String(v ?? '')}"`;
}


export function buildInputMembers(inputs?: GitHubActionInputs): string {
  if (!inputs) return '';
  return Object.entries(inputs)
    .map(([key, val]) => {
      let commentParts: string[] = [];
      if (val.description) commentParts.push(val.description);
      if (val.default !== undefined) commentParts.push(`default: ${JSON.stringify(val.default)}`);
      const desc = commentParts.length > 0 ? `    /* ${commentParts.join(' | ')} */ ` : '';
      const required = val.required === true || val.required === 'true';
      return `${desc}${key}${required ? '' : '?'}: string;`;
    })
    .join('\n    ');
}


import type { GitHubActionInputs, GitHubActionOutputs } from './types/common';

function buildOutputMembers(outputs?: GitHubActionOutputs): string {
  if (!outputs) return '';
  return Object.entries(outputs)
    .map(([key, val]) => {
      const desc = val.description ? `    /* ${val.description} */ ` : '';
      return `${desc}${key}: string;`;
    })
    .join('\n    ');
}


function createInputsWithDefaultsDecl(inputs?: GitHubActionInputs): string {
  const props: string[] = [];
  if (inputs) {
    for (const [key, val] of Object.entries(inputs)) {
      if (val.default !== undefined) {
        props.push(`    ${key}: ${createLiteralFromValue(val.default)}`);
      }
    }
  }
  props.push('    ...inputs');
  return `    const inputsWithDefaults = {\n${props.join(',\n')}\n    };`;
}


function createFactoryFunction(
  ActionName: string,
  actionNameCamel: string,
  repo: string,
  ref: string,
  inputs?: GitHubActionInputs
): string {
  return `export function ${actionNameCamel}(inputs: ${ActionName}Inputs, step?: Partial<GitHubStep<${ActionName}Inputs>>, ref?: string): GitHubStep {\n${createInputsWithDefaultsDecl(inputs)}\n    return createStep("${repo}", inputsWithDefaults, step, ref ?? "${ref}");\n}`;
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
 * @returns A string containing the generated TypeScript code.
 *
 * @throws If the YAML definition is missing a `name` property.
 */
export function generateTypesFromYml(
  yml: GitHubActionYml,
  repo: string = 'actions/my-action',
  ref: string = 'main'
): string {
  if (!yml || !yml.name) throw new Error('Action YAML must have a name');

  const actionName = yml.name.replace(/[^a-zA-Z0-9]/g, ' ');
  const ActionName = toProperCase(actionName.replace(/\s+/g, ' '));
  const actionNameCamel = ActionName.charAt(0).toLowerCase() + ActionName.slice(1);

  // Inputs type
  const inputMembers = buildInputMembers(yml.inputs as any);
  const inputsType = `export type ${ActionName}Inputs = {\n    ${inputMembers}\n};`;

  // Outputs type
  let outputsType = '';
  if (yml.outputs) {
    const outputMembers = buildOutputMembers(yml.outputs as any);
    outputsType = `export type ${ActionName}Outputs = {\n    ${outputMembers}\n};`;
  }

  // Attach comment with description + repo link
  const descriptionComment = yml.description
    ? `/*\n  ${yml.description}\n  https://github.com/${repo}/tree/${ref}\n*/\n`
    : '';

  const func = descriptionComment + createFactoryFunction(ActionName, actionNameCamel, repo, ref, yml.inputs as any);

  return [inputsType, outputsType, func].filter(Boolean).join('\n') + '\n';
}
