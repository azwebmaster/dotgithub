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
    expect(result).toContain('/* desc | default: "bar" */ foo: string;');
    expect(result).toContain('/* baz desc */ baz?: string;');
    expect(result).toContain('/* default: "42" */ qux: string;');
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
    expect(code).toContain('name: "John Doe"');
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
});
