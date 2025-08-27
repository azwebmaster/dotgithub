import { describe, it, expect } from 'vitest';
import { buildInputMembers } from './typegen';

describe('buildInputMembers', () => {
  it('includes description and default in comment if present', () => {
    const inputs = {
      foo: { description: 'desc', default: 'bar', required: true },
      baz: { description: 'baz desc', required: false },
      qux: { default: 42, required: true },
      noComment: { required: true },
    };
    const result = buildInputMembers(inputs);
    expect(result).toContain('/* desc | default: "bar" */ foo: string;');
    expect(result).toContain('/* baz desc */ baz?: string;');
    expect(result).toContain('/* default: 42 */ qux: string;');
    expect(result).toContain('noComment: string;');
  });

  it('returns empty string for undefined inputs', () => {
    expect(buildInputMembers(undefined)).toBe('');
  });
});
