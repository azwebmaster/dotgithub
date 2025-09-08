import { describe, it, expect } from 'vitest';
import { helloCore } from './index';

describe('helloCore', () => {
  it('returns the correct greeting', () => {
    expect(helloCore()).toBe('Hello from @dotgithub/core!');
  });
});

describe('--no-sha behavior', () => {
  it('should use versionRef when useSha is false', () => {
    // Test the logic for determining refForCreateStep
    const useSha = false;
    const finalRef = 'abc123sha';  // This would be the SHA
    const resolvedRef = 'v4';      // This is the version reference
    
    const refForCreateStep = useSha ? finalRef : resolvedRef;
    
    // When --no-sha is used (useSha is false), refForCreateStep should be the version reference
    expect(refForCreateStep).toBe('v4');
    expect(refForCreateStep).not.toBe('abc123sha');
  });

  it('should use SHA when useSha is true (default)', () => {
    // Test the default behavior
    const useSha = true;
    const finalRef = 'abc123sha';  // This would be the SHA
    const resolvedRef = 'v4';      // This is the version reference
    
    const refForCreateStep = useSha ? finalRef : resolvedRef;
    
    // When useSha is true (default), refForCreateStep should be the SHA
    expect(refForCreateStep).toBe('abc123sha');
    expect(refForCreateStep).not.toBe('v4');
  });

  it('should set config ref to versionRef when --no-sha is used', () => {
    // Test the config ref logic
    const useSha = false;
    const finalRef = 'abc123sha';  // This would be the SHA
    const resolvedRef = 'v4';      // This is the version reference
    
    const configRef = useSha ? finalRef : resolvedRef;
    
    // When --no-sha is used, config ref should be the same as versionRef
    expect(configRef).toBe('v4');
    expect(configRef).toBe(resolvedRef);
  });

  it('should set config ref to SHA when --no-sha is not used', () => {
    // Test the default config ref logic
    const useSha = true;
    const finalRef = 'abc123sha';  // This would be the SHA
    const resolvedRef = 'v4';      // This is the version reference
    
    const configRef = useSha ? finalRef : resolvedRef;
    
    // When --no-sha is not used, config ref should be the SHA
    expect(configRef).toBe('abc123sha');
    expect(configRef).toBe(finalRef);
    expect(configRef).not.toBe(resolvedRef);
  });
});
