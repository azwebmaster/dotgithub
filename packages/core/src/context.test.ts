import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import { DotGithubContext } from './context';
import type { DotGithubConfig } from './config';

// Mock the config module
vi.mock('./config', () => ({
  readConfig: vi.fn()
}));

describe('DotGithubContext', () => {
  let mockConfigPath: string;
  let testConfig: DotGithubConfig;

  beforeEach(() => {
    // Use mock paths instead of creating actual files
    mockConfigPath = '/mock/project/.github/dotgithub.json';

    testConfig = {
      version: '1.0.0',
      outputDir: 'src',
      actions: [
        {
          orgRepo: 'actions/checkout',
          ref: 'abc123',
          versionRef: 'v5',
          functionName: 'checkout',
          outputPath: 'actions/checkout/checkout.ts'
        }
      ],
      plugins: [],
      stacks: []
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config and paths', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      expect(context.config).toEqual(testConfig);
      expect(context.configPath).toBe(mockConfigPath);
      expect(context.outputPath).toBe(path.join(path.dirname(mockConfigPath), testConfig.outputDir));
    });
  });

  describe('relativePath', () => {
    it('should calculate relative path from output directory', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const absolutePath = '/mock/project/.github/src/actions/action1/checkout.ts';
      const relative = context.relativePath(absolutePath);

      expect(relative).toBe('actions/action1/checkout.ts');
    });

    it('should handle paths outside output directory', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const absolutePath = '/mock/project/other/file.ts';
      const relative = context.relativePath(absolutePath);

      expect(relative).toBe(path.join('..', '..', 'other', 'file.ts'));
    });

    it('should handle the output directory itself', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const outputDir = '/mock/project/.github/src';
      const relative = context.relativePath(outputDir);

      expect(relative).toBe('');
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative paths from output directory', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath('actions/checkout.ts');
      const expected = path.resolve('/mock/project/.github/src/actions/checkout.ts');

      expect(resolved).toBe(expected);
    });

    it('should handle empty path correctly', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath('');
      const expected = path.resolve('/mock/project/.github/src');

      expect(resolved).toBe(expected);
    });

    it('should handle nested paths', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath('actions/github/codeql-action/analyze/action.ts');
      const expected = path.resolve('/mock/project/.github/src/actions/github/codeql-action/analyze/action.ts');

      expect(resolved).toBe(expected);
    });

    it('should work with different outputDir values', () => {
      const customConfig: DotGithubConfig = {
        ...testConfig,
        outputDir: 'generated'
      };

      const context = new DotGithubContext({
        config: customConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath('actions/test.ts');
      const expected = path.resolve('/mock/project/.github/generated/actions/test.ts');

      expect(resolved).toBe(expected);
    });

    it('should handle .. in paths correctly', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath('../other/file.ts');
      const expected = path.resolve('/mock/project/.github/other/file.ts');

      expect(resolved).toBe(expected);
    });
  });

  describe('fromConfig', () => {
    it('should create context from config file path', async () => {
      const { readConfig } = await import('./config');
      vi.mocked(readConfig).mockReturnValue(testConfig);

      const context = DotGithubContext.fromConfig(mockConfigPath);

      expect(readConfig).toHaveBeenCalledWith(mockConfigPath);
      expect(context.config).toEqual(testConfig);
      expect(context.configPath).toBe(mockConfigPath);
      expect(context.outputPath).toBe(path.join(path.dirname(mockConfigPath), testConfig.outputDir));
    });

    it('should handle relative config paths', async () => {
      const { readConfig } = await import('./config');
      vi.mocked(readConfig).mockReturnValue(testConfig);

      const relativePath = 'relative/path/dotgithub.json';
      const absolutePath = path.resolve(relativePath);

      const context = DotGithubContext.fromConfig(relativePath);

      expect(readConfig).toHaveBeenCalledWith(absolutePath);
      expect(context.config).toEqual(testConfig);
      expect(context.configPath).toBe(absolutePath);
    });

    it('should create context with default config for non-existent file', async () => {
      const { readConfig } = await import('./config');
      const defaultConfig: DotGithubConfig = {
        version: '1.0.0',
        outputDir: 'src',
        actions: [],
        plugins: [],
        stacks: []
      };
      vi.mocked(readConfig).mockReturnValue(defaultConfig);

      const nonExistentPath = '/mock/non-existent.json';
      const context = DotGithubContext.fromConfig(nonExistentPath);

      expect(context).toBeDefined();
      expect(context.config).toEqual(defaultConfig);
    });
  });

  describe('path resolution scenarios', () => {
    it('should correctly resolve action paths matching the fixed behavior', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      // Test the scenario from the bug fix
      const actionPath = context.resolvePath('');
      const repoDir = path.join(actionPath, 'actions', 'checkout');
      const filePath = path.join(repoDir, 'checkout.ts');

      // Calculate relative path like in actions-manager.ts
      const relativePath = path.relative(actionPath, filePath);

      expect(relativePath).toBe(path.join('actions', 'checkout', 'checkout.ts'));
    });

    it('should handle multi-action repos with subdirectories', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const baseDir = context.resolvePath('');
      const repoDir = path.join(baseDir, 'github', 'codeql-action');
      const actionSubDir = path.join(repoDir, 'analyze');
      const filePath = path.join(actionSubDir, 'codeql-analyze.ts');

      const relativePath = path.relative(baseDir, filePath);

      expect(relativePath).toBe(path.join('github', 'codeql-action', 'analyze', 'codeql-analyze.ts'));
    });

    it('should maintain consistent paths across operations', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      // Simulate adding an action
      const outputPath = 'actions/new-org/new-repo/action.ts';
      const fullPath = context.resolvePath(outputPath);

      // Simulate reading it back
      const baseDir = context.resolvePath('');
      const relativePath = path.relative(baseDir, fullPath);

      expect(relativePath).toBe(outputPath);
    });
  });

  describe('edge cases', () => {
    it('should handle Windows-style paths', () => {
      const winPath = 'actions\\windows\\path\\file.ts';
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath(winPath);
      // On Unix systems, backslashes are treated as literal characters in file names
      // path.resolve will preserve them as part of the filename
      const isWindows = process.platform === 'win32';
      const expected = isWindows
        ? path.resolve('/mock/project/.github/src/actions/windows/path/file.ts')
        : path.resolve('/mock/project/.github/src', winPath);

      expect(resolved).toBe(expected);
    });

    it('should handle paths with spaces', () => {
      const context = new DotGithubContext({
        config: testConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath('actions/my action/with spaces.ts');
      const expected = path.resolve('/mock/project/.github/src/actions/my action/with spaces.ts');

      expect(resolved).toBe(expected);
    });

    it('should handle empty outputDir', () => {
      const customConfig: DotGithubConfig = {
        ...testConfig,
        outputDir: ''
      };

      const context = new DotGithubContext({
        config: customConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath('actions/test.ts');
      const expected = path.resolve('/mock/project/.github/actions/test.ts');

      expect(resolved).toBe(expected);
    });

    it('should handle . as outputDir', () => {
      const customConfig: DotGithubConfig = {
        ...testConfig,
        outputDir: '.'
      };

      const context = new DotGithubContext({
        config: customConfig,
        configPath: mockConfigPath
      });

      const resolved = context.resolvePath('actions/test.ts');
      const expected = path.resolve('/mock/project/.github/actions/test.ts');

      expect(resolved).toBe(expected);
    });
  });
});