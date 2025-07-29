import { describe, it, expect } from 'vitest';
import { helloCli } from './index';

describe('helloCli', () => {
  it('returns the correct greeting', () => {
    expect(helloCli()).toBe('Hello from @dotgithub/cli!');
  });
});
