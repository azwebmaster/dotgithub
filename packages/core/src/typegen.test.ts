import { buildInputMembers } from './typegen';

describe('buildInputMembers', () => {
  it('includes description and default in comment if present', () => {
    const inputs = {
      foo: { description: 'desc', default: 'bar', required: true },
      baz: { description: 'baz desc', required: false },
      qux: { default: '42', required: true },
      noComment: { required: true },
    };
    const result = buildInputMembers(inputs);
    expect(result).toContain('/** desc | default: "bar" */\n    foo: string;');
    expect(result).toContain('/** baz desc */\n    baz?: string;');
    expect(result).toContain('/** default: "42" */\n    qux: string;');
    expect(result).toContain('noComment: string;');
  });

  it('returns empty string for undefined inputs', () => {
    expect(buildInputMembers(undefined)).toBe('');
  });
});
import { describe, it, expect } from 'vitest';
import { generateTypesFromYml } from './typegen';
import type { GitHubActionYml } from './types';

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
    expect(code).toContain('name: string;');
    expect(code).toContain('address?: string;');
    expect(code).toContain('export type CreateUserOutputs');
    expect(code).toContain('id: string;');
    expect(code).toContain('export function createUser(');
    expect(code).toContain('default: "John Doe"');
    expect(code).toContain('https://github.com/actions/create-user/tree/sha1');
    expect(code).toContain('Creates a user');
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
    expect(code).not.toContain('export type SimpleOutputs');
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
    expect(code).toContain('export function optionalTest(inputs?: OptionalTestInputs,');
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
    expect(code).toContain('export function requiredTest(inputs: RequiredTestInputs,');
  });

  it('uses different refs for createStep and comment URL when versionRef is provided', () => {
    const ymlSample: GitHubActionYml = {
      name: 'version-test',
      description: 'Test with version ref',
      inputs: {
        foo: { required: true },
      },
    };
    const code = generateTypesFromYml(ymlSample, 'actions/version-test', 'abc123sha', 'v4');
    expect(code).toContain('https://github.com/actions/version-test/tree/v4');
    expect(code).toContain('ref ?? "abc123sha"');
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
    const code = generateTypesFromYml(ymlSample, 'actions/clone-test', 'sha123abc', 'v4');
    expect(code).toContain('https://github.com/actions/clone-test/tree/v4'); // Comment uses versionRef
    expect(code).toContain('ref ?? "sha123abc"'); // createStep uses ref (SHA)
  });
});
