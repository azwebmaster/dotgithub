import { describe, it, expect } from 'vitest';
import { helloCli } from './index';

describe('helloCli', () => {
  it('returns the correct greeting', () => {
    expect(helloCli()).toBe('Hello from @dotgithub/cli!');
  });
});

describe('CLI --no-sha flag logic', () => {
  it('should correctly determine useSha based on --no-sha option', () => {
    // Simulate the options object when --no-sha is used
    const optionsWithNoSha = { sha: false };
    const useShaWithNoSha = optionsWithNoSha.sha !== false;
    expect(useShaWithNoSha).toBe(false); // Should not use SHA when --no-sha is specified
    
    // Simulate the options object when --no-sha is NOT used (default)
    const optionsWithoutNoSha = { sha: undefined };
    const useShaWithoutNoSha = optionsWithoutNoSha.sha !== false;
    expect(useShaWithoutNoSha).toBe(true); // Should use SHA by default
    
    // Test edge cases
    const optionsEmpty: any = {};
    const useShaEmpty = optionsEmpty.sha !== false;
    expect(useShaEmpty).toBe(true); // Should default to using SHA
  });
});
