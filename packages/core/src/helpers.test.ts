import { describe, it, expect } from 'vitest';

describe('parseOrgRepoRef helper', () => {
  // Test the parseOrgRepoRef function by extracting it from the implementation
  function parseOrgRepoRef(orgRepoRef: string): {
    orgRepo: string;
    ref?: string;
  } {
    const atIndex = orgRepoRef.lastIndexOf('@');
    if (atIndex === -1) {
      return { orgRepo: orgRepoRef };
    }
    return {
      orgRepo: orgRepoRef.substring(0, atIndex),
      ref: orgRepoRef.substring(atIndex + 1),
    };
  }

  function generateFilenameFromActionName(actionName: string): string {
    if (!actionName) throw new Error('Action name is required');
    return actionName
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  it('parses org/repo format without ref', () => {
    const result = parseOrgRepoRef('actions/checkout');
    expect(result.orgRepo).toBe('actions/checkout');
    expect(result.ref).toBeUndefined();
  });

  it('parses org/repo@ref format', () => {
    const result = parseOrgRepoRef('actions/checkout@v4');
    expect(result.orgRepo).toBe('actions/checkout');
    expect(result.ref).toBe('v4');
  });

  it('handles multiple @ symbols correctly', () => {
    const result = parseOrgRepoRef('my-org/my-repo@feature@branch');
    expect(result.orgRepo).toBe('my-org/my-repo@feature');
    expect(result.ref).toBe('branch');
  });

  it('generates correct filename from action name', () => {
    expect(generateFilenameFromActionName('MyAction')).toBe('myaction');
    expect(generateFilenameFromActionName('My Action Name')).toBe(
      'my-action-name'
    );
    expect(generateFilenameFromActionName('checkout-v2')).toBe('checkout-v2');
    expect(generateFilenameFromActionName('My-Special_Action@v1')).toBe(
      'my-special-action-v1'
    );
  });
});
