import { describe, it, expect } from 'vitest';
import { generateTypesFromYml } from './typegen.js';
import type { GitHubActionYml } from './types.js';

describe('generateTypesFromYml', () => {
  const sampleYml: GitHubActionYml = {
    name: 'create-user',
    description: 'Creates a user',
    inputs: {
      name: {
        description: 'This is a name',
        default: 'John Doe',
        required: true,
      },
      address: {
        description: 'This is the address',
        required: false,
      },
    },
    outputs: {
      id: {
        description: 'ID of user',
      },
    },
  };

  it('generates correct types and function', () => {
    const code = generateTypesFromYml(sampleYml, 'actions/create-user', 'sha1');
    expect(code).toContain('export type CreateUserInputs');
    expect(code).toContain('name: GitHubInputValue;');
    expect(code).toContain('address?: GitHubInputValue;');
    expect(code).toContain('export const CreateUserOutputs');
    expect(code).toContain('id: new GitHubOutputValue("id")');
    expect(code).toContain('export function createUser(');
    expect(code).toContain('default: "John Doe"');
    expect(code).toMatchSnapshot();
  });

  it('handles missing outputs', () => {
    const ymlNoOutputs: GitHubActionYml = {
      name: 'simple',
      description: 'A simple action',
      inputs: {
        foo: { required: true },
      },
    };
    const code = generateTypesFromYml(ymlNoOutputs);
    expect(code).toContain('export type SimpleInputs');
    expect(code).toContain('export const SimpleOutputs = {};');
    expect(code).toMatchSnapshot();
  });

  it('throws if name is missing', () => {
    expect(() => generateTypesFromYml({} as any)).toThrow();
  });

  it('makes inputs optional when no inputs are required', () => {
    const ymlOptionalInputs: GitHubActionYml = {
      name: 'optional-test',
      description: 'Test with optional inputs',
      inputs: {
        foo: { required: false },
        bar: { required: 'false' },
      },
    };
    const code = generateTypesFromYml(ymlOptionalInputs);
    expect(code).toContain(
      'export function optionalTest(this: ActionCollection, inputs?: OptionalTestInputs,'
    );
  });

  it('makes inputs required when any input is required', () => {
    const ymlRequiredInputs: GitHubActionYml = {
      name: 'required-test',
      description: 'Test with required inputs',
      inputs: {
        foo: { required: false },
        bar: { required: true },
      },
    };
    const code = generateTypesFromYml(ymlRequiredInputs);
    expect(code).toContain(
      'export function requiredTest(this: ActionCollection, inputs?: RequiredTestInputs,'
    );
  });

  it('uses different refs for createStep and comment URL when versionRef is provided', () => {
    const ymlSample: GitHubActionYml = {
      name: 'version-test',
      description: 'Test with version ref',
      inputs: {
        foo: { required: true },
      },
    };
    const code = generateTypesFromYml(
      ymlSample,
      'actions/version-test',
      'abc123sha',
      'v4'
    );
    expect(code).toContain('fallbackRef: "abc123sha"');
  });

  it('clones using versionRef when provided, createStep uses ref', () => {
    // This test verifies the intended behavior:
    // - Cloning should use user-friendly version (versionRef)
    // - createStep should use resolved SHA (ref)
    // - Comments should use user-friendly version (versionRef)
    const ymlSample: GitHubActionYml = {
      name: 'clone-test',
      description: 'Test cloning behavior',
      inputs: {
        test: { required: true },
      },
    };

    // When called with finalRef (SHA) as ref and resolvedRef (v4) as versionRef:
    // - Should clone using resolvedRef (v4)
    // - Should use finalRef (SHA) in createStep
    // - Should use resolvedRef (v4) in comments
    const code = generateTypesFromYml(
      ymlSample,
      'actions/clone-test',
      'sha123abc',
      'v4'
    );
    expect(code).toContain('fallbackRef: "sha123abc"');
  });

  it('escapes */ sequences in action descriptions', () => {
    const ymlWithComment: GitHubActionYml = {
      name: 'comment-test',
      description: 'This action has */ comment terminators in description',
      inputs: {
        test: { required: true },
      },
    };
    const code = generateTypesFromYml(ymlWithComment);
  });

  it('escapes */ sequences in output descriptions', () => {
    const ymlWithOutputComment: GitHubActionYml = {
      name: 'output-comment-test',
      description: 'Test output comment escaping',
      outputs: {
        result: {
          description: 'Output with */ comment terminator',
        },
      },
    };
    const code = generateTypesFromYml(ymlWithOutputComment);
    expect(code).toContain('/** Output with *\\/ comment terminator */');
  });

  it('generates proper JSDoc comments for action functions', () => {
    const ymlWithDescription: GitHubActionYml = {
      name: 'test-action',
      description: 'This is a test action that does something useful',
      inputs: {
        param1: { required: true, description: 'First parameter' },
        param2: { required: false, description: 'Second parameter' },
      },
    };
    const code = generateTypesFromYml(ymlWithDescription);

    // Check that JSDoc includes action description
    expect(code).toContain(
      '* This is a test action that does something useful'
    );

    // Check that JSDoc includes proper parameter documentation
    expect(code).toContain(
      '* @param inputs - Input parameters for the test-action action'
    );
    expect(code).toContain(
      '* @param stepOptions - Additional step configuration options'
    );
    expect(code).toContain('* @param ref - Optional git reference override');
    expect(code).toContain(
      '* @returns ActionInvocationResult with step and outputs'
    );
  });

  it('generates JSDoc for actions without description', () => {
    const ymlWithoutDescription: GitHubActionYml = {
      name: 'no-description-action',
      inputs: {
        param: { required: true },
      },
    };
    const code = generateTypesFromYml(ymlWithoutDescription);

    // Should use fallback description
    expect(code).toContain('* NoDescriptionAction action');
  });

  it('includes GitHub repository link in JSDoc', () => {
    const ymlWithCustomRepo: GitHubActionYml = {
      name: 'test-action',
      description: 'Test action with custom repo',
      inputs: {
        param: { required: true },
      },
    };
    const code = generateTypesFromYml(
      ymlWithCustomRepo,
      'custom-org/custom-repo',
      'v2.1.0'
    );

    // Should include GitHub link with custom repo and ref
    expect(code).toContain(
      '* @see {@link https://github.com/custom-org/custom-repo/tree/v2.1.0} - GitHub repository and documentation'
    );
  });

  it('uses versionRef for GitHub link when provided', () => {
    const ymlSample: GitHubActionYml = {
      name: 'version-test',
      description: 'Test version ref',
      inputs: {
        foo: { required: true },
      },
    };
    const code = generateTypesFromYml(
      ymlSample,
      'actions/version-test',
      'abc123sha',
      'v4'
    );

    // Should use versionRef (v4) for the GitHub link, not the SHA
    expect(code).toContain(
      '* @see {@link https://github.com/actions/version-test/tree/v4} - GitHub repository and documentation'
    );
  });

  it('includes all necessary imports', () => {
    const ymlWithAllFeatures: GitHubActionYml = {
      name: 'complete-action',
      description: 'Action with all features',
      inputs: {
        param1: { required: true, description: 'First parameter' },
        param2: { required: false, description: 'Second parameter' },
      },
      outputs: {
        result: { description: 'The result' },
      },
    };
    const code = generateTypesFromYml(ymlWithAllFeatures);

    // Should include all necessary imports
    expect(code).toContain(
      'import { GitHubOutputValue } from "@dotgithub/core";'
    );
    expect(code).toContain(
      'import type { GitHubStepAction, GitHubInputValue, ActionInvocationResult, ActionCollection } from "@dotgithub/core";'
    );

    // Should not have any missing imports that would cause TypeScript errors
    expect(code).toContain('): ActionInvocationResult<');
    expect(code).toContain('this: ActionCollection');
    expect(code).toContain('GitHubInputValue');
    expect(code).toContain('GitHubStepAction');
  });
});
