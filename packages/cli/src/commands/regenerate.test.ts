import { describe, it, expect } from 'vitest';
import { createRegenerateCommand } from './regenerate';

describe('createRegenerateCommand', () => {
  it('creates a regenerate command with correct configuration', () => {
    const command = createRegenerateCommand();
    
    expect(command.name()).toBe('regenerate');
    expect(command.description()).toBe('Regenerate TypeScript files based on the config');
    
    // Check that it has the expected options
    const options = command.options;
    expect(options.some(opt => opt.flags === '-t, --token <token>')).toBe(true);
    expect(options.some(opt => opt.flags === '--prune')).toBe(true);
  });

  it('has correct option descriptions', () => {
    const command = createRegenerateCommand();
    
    // Verify option configuration
    const tokenOption = command.options.find(opt => opt.flags === '-t, --token <token>');
    expect(tokenOption).toBeDefined();
    expect(tokenOption?.description).toContain('GitHub token');
    
    const pruneOption = command.options.find(opt => opt.flags === '--prune');
    expect(pruneOption).toBeDefined();
    expect(pruneOption?.description).toContain('Remove orphaned files');
  });
});