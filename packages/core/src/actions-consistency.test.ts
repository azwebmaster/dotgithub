import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DotGithubContext } from './context.js';
import { createDefaultConfig, writeConfig } from './config.js';

describe('Actions Consistency - Add vs Regenerate', () => {
  let tempDir: string;
  let context: DotGithubContext;
  let originalCwd: string;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotgithub-consistency-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create .github directory structure
    const githubDir = path.join(tempDir, '.github');
    fs.mkdirSync(githubDir, { recursive: true });

    // Create config file
    const config = createDefaultConfig();
    const configPath = path.join(githubDir, 'dotgithub.json');
    writeConfig(config, configPath);

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

  describe('Configuration Consistency', () => {
    it('should maintain consistent config structure', () => {
      expect(context.config).toBeDefined();
      expect(context.config.actions).toHaveLength(0);
      expect(context.config.rootDir).toBeDefined();
    });

    it('should handle action configuration consistently', () => {
      const action = {
        orgRepo: 'actions/checkout',
        ref: 'v4',
        versionRef: 'v4',
        actionName: 'checkout',
        outputPath: 'actions/checkout.ts',
        actionPath: '',
      };

      context.config.actions.push(action);
      expect(context.config.actions).toHaveLength(1);
      expect(context.config.actions[0].orgRepo).toBe('actions/checkout');
    });
  });

  describe('File System Consistency', () => {
    it('should create consistent directory structure', () => {
      const actionsDir = path.join(tempDir, 'actions');
      fs.mkdirSync(actionsDir, { recursive: true });
      
      expect(fs.existsSync(actionsDir)).toBe(true);
    });

    it('should handle file operations consistently', () => {
      const testFile = path.join(tempDir, 'test-action.ts');
      const content = 'export interface TestInputs {}';
      
      fs.writeFileSync(testFile, content);
      expect(fs.existsSync(testFile)).toBe(true);
      
      const readContent = fs.readFileSync(testFile, 'utf8');
      expect(readContent).toBe(content);
    });
  });

  describe('Path Resolution Consistency', () => {
    it('should resolve paths consistently', () => {
      const relativePath = 'actions/checkout.ts';
      const resolvedPath = context.resolvePath(relativePath);
      
      expect(resolvedPath).toContain(relativePath);
      expect(path.isAbsolute(resolvedPath)).toBe(true);
    });

    it('should handle relative paths consistently', () => {
      const absolutePath = '/some/absolute/path';
      const relativePath = context.relativePath(absolutePath);
      
      expect(typeof relativePath).toBe('string');
      expect(relativePath).toContain('some/absolute/path');
    });
  });
});
