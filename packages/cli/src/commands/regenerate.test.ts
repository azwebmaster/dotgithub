import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRegenerateCommand } from './regenerate';
import { DotGithubContext, createDefaultConfig } from '@dotgithub/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('createRegenerateCommand', () => {
  let tempDir: string;
  let context: DotGithubContext;
  let originalCwd: string;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotgithub-regenerate-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create .github directory structure
    const githubDir = path.join(tempDir, '.github');
    fs.mkdirSync(githubDir, { recursive: true });

    // Create config with some actions
    const config = createDefaultConfig();
    config.actions = [
      {
        orgRepo: 'actions/checkout',
        ref: 'v4',
        versionRef: 'v4',
        actionName: 'checkout',
        outputPath: 'actions/checkout.ts',
        actionPath: '',
      },
      {
        orgRepo: 'actions/setup-node',
        ref: 'v4',
        versionRef: 'v4',
        actionName: 'setupNode',
        outputPath: 'actions/setup-node.ts',
        actionPath: '',
      },
    ];

    const configPath = path.join(githubDir, 'dotgithub.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Create context
    context = new DotGithubContext({
      config,
      configPath,
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates a regenerate command with correct configuration', () => {
    const command = createRegenerateCommand(() => context);

    expect(command.name()).toBe('regenerate');
    expect(command.description()).toBe(
      'Regenerate TypeScript files based on the config'
    );
  });

  it('has correct options', () => {
    const command = createRegenerateCommand(() => context);

    const options = command.options;
    expect(options.some((opt) => opt.flags === '-t, --token <token>')).toBe(true);
    expect(options.some((opt) => opt.flags === '--prune')).toBe(true);
  });

  it('should have proper option descriptions', () => {
    const command = createRegenerateCommand(() => context);

    const tokenOption = command.options.find((opt) => opt.flags === '-t, --token <token>');
    expect(tokenOption).toBeDefined();
    expect(tokenOption?.description).toContain('GitHub token');

    const pruneOption = command.options.find((opt) => opt.flags === '--prune');
    expect(pruneOption).toBeDefined();
    expect(pruneOption?.description).toContain('Remove orphaned files');
  });

  it('should create command with proper argument handling', () => {
    const command = createRegenerateCommand(() => context);

    // Test that the command is properly configured
    expect(command).toBeDefined();
    expect(command.name()).toBe('regenerate');
  });

  it('should handle context creation correctly', () => {
    const mockCreateContext = () => context;
    const command = createRegenerateCommand(mockCreateContext);

    expect(command).toBeDefined();
    expect(command.name()).toBe('regenerate');
  });

  it('should handle config with actions', () => {
    expect(context.config.actions).toHaveLength(2);
    const actions = context.config.actions!;
    expect(actions[0]!.orgRepo).toBe('actions/checkout');
    expect(actions[1]!.orgRepo).toBe('actions/setup-node');
  });
});