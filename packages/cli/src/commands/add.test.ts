import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAddCommand } from './add';
import { DotGithubContext, createDefaultConfig } from '@dotgithub/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('createAddCommand', () => {
  let tempDir: string;
  let context: DotGithubContext;
  let originalCwd: string;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotgithub-cli-test-'));
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

  it('creates a command with correct configuration', () => {
    const command = createAddCommand(() => context);

    expect(command.name()).toBe('add');
    expect(command.description()).toBe(
      'Add GitHub Actions to configuration and generate TypeScript files'
    );

    // Check that command is properly configured
    expect(command).toBeDefined();
  });

  it('has correct options', () => {
    const command = createAddCommand(() => context);

    const options = command.options;
    expect(options.some((opt) => opt.flags === '--output <outputDir>')).toBe(true);
    expect(options.some((opt) => opt.flags === '-t, --token <token>')).toBe(true);
    expect(options.some((opt) => opt.flags === '--no-sha')).toBe(true);
    expect(options.some((opt) => opt.flags === '--name <name>')).toBe(true);
  });

  it('should have proper option descriptions', () => {
    const command = createAddCommand(() => context);

    const outputOption = command.options.find((opt) => opt.flags === '--output <outputDir>');
    expect(outputOption).toBeDefined();
    expect(outputOption?.description).toContain('Output directory');

    const tokenOption = command.options.find((opt) => opt.flags === '-t, --token <token>');
    expect(tokenOption).toBeDefined();
    expect(tokenOption?.description).toContain('GitHub token');

    const noShaOption = command.options.find((opt) => opt.flags === '--no-sha');
    expect(noShaOption).toBeDefined();
    expect(noShaOption?.description).toContain('Use the original ref');

    const nameOption = command.options.find((opt) => opt.flags === '--name <name>');
    expect(nameOption).toBeDefined();
    expect(nameOption?.description).toContain('Override the action name');
  });

  it('should create command with proper argument handling', () => {
    const command = createAddCommand(() => context);

    // Test that the command is properly configured
    expect(command).toBeDefined();
    expect(command.name()).toBe('add');
  });

  it('should handle context creation correctly', () => {
    const mockCreateContext = () => context;
    const command = createAddCommand(mockCreateContext);

    expect(command).toBeDefined();
    expect(command.name()).toBe('add');
  });
});
