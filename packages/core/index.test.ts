import { describe, it, expect } from 'vitest';
import { helloCore } from './index';

describe('helloCore', () => {
  it('returns the correct greeting', () => {
    expect(helloCore()).toBe('Hello from @dotgithub/core!');
  });
});
