import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRemoveCommand } from './remove';
import { DotGithubContext, createDefaultConfig } from '@dotgithub/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('createRemoveCommand', () => {
  let tempDir: string;
  let context: DotGithubContext;
  let originalCwd: string;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotgithub-remove-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create .github directory structure
    const githubDir = path.join(tempDir, '.github');
    fs.mkdirSync(githubDir, { recursive: true });

    // Create config file
    const config = createDefaultConfig();
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

  it('creates a remove command with correct configuration', () => {
    const command = createRemoveCommand(() => context);

    expect(command.name()).toBe('remove');
    expect(command.alias()).toBe('rm');
    expect(command.description()).toBe(
      'Remove a GitHub Action from tracking and delete generated files'
    );
  });

  it('has correct options', () => {
    const command = createRemoveCommand(() => context);

    const options = command.options;
    expect(options.some((opt) => opt.flags === '--keep-files')).toBe(true);
  });

  it('should have proper option descriptions', () => {
    const command = createRemoveCommand(() => context);

    const keepFilesOption = command.options.find((opt) => opt.flags === '--keep-files');
    expect(keepFilesOption).toBeDefined();
    expect(keepFilesOption?.description).toContain('Remove from tracking but keep generated files');
  });

  it('should create command with proper argument handling', () => {
    const command = createRemoveCommand(() => context);

    // Test that the command is properly configured
    expect(command).toBeDefined();
    expect(command.name()).toBe('remove');
  });

  it('should handle context creation correctly', () => {
    const mockCreateContext = () => context;
    const command = createRemoveCommand(mockCreateContext);

    expect(command).toBeDefined();
    expect(command.name()).toBe('remove');
  });
});
