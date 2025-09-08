import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  readConfig,
  writeConfig,
  addActionToConfig,
  removeActionFromConfig,
  getActionsFromConfig,
  getActionsFromConfigWithResolvedPaths,
  getResolvedOutputPath,
  updateOutputDir,
  createDefaultConfig,
  getConfigPath
} from './config';

describe('config', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotgithub-config-test-'));
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    
    // Change to temp directory
    process.chdir(tempDir);
    
    // Create .github directory
    fs.mkdirSync(path.join(tempDir, '.github'), { recursive: true });
  });

  afterEach(() => {
    // Restore original working directory and environment
    process.chdir(originalCwd);
    process.env = originalEnv;
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('createDefaultConfig', () => {
    it('creates a valid default config', () => {
      const config = createDefaultConfig();
      
      expect(config.version).toBe('1.0.0');
      expect(config.outputDir).toBe('.github/actions');
      expect(config.actions).toEqual([]);
      expect(config.options!.tokenSource).toBe('env');
      expect(config.options!.formatting!.prettier).toBe(true);
    });
  });

  describe('getConfigPath', () => {
    it('returns path in .github directory', () => {
      const configPath = getConfigPath();
      expect(configPath).toContain('.github');
      expect(configPath).toContain('dotgithub.json');
    });
  });

  describe('readConfig and writeConfig', () => {
    it('creates default config when file does not exist', () => {
      const config = readConfig();
      
      expect(config.version).toBe('1.0.0');
      expect(config.outputDir).toBe('.github/actions');
      expect(config.actions).toEqual([]);
    });

    it('reads existing config file', () => {
      const testConfig = createDefaultConfig();
      testConfig.outputDir = 'custom/path';
      
      writeConfig(testConfig);
      const readBack = readConfig();
      
      expect(readBack.outputDir).toBe('custom/path');
      expect(readBack.version).toBe('1.0.0');
    });

    it('creates .github directory if it does not exist', () => {
      // Remove .github directory
      fs.rmSync(path.join(tempDir, '.github'), { recursive: true, force: true });
      
      const config = createDefaultConfig();
      writeConfig(config);
      
      expect(fs.existsSync(path.join(tempDir, '.github'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.github', 'dotgithub.json'))).toBe(true);
    });
  });

  describe('addActionToConfig', () => {
    it('adds new action to empty config', () => {
      // Create a test output file path within the temp directory
      const absoluteOutputPath = path.join(tempDir, 'actions', 'checkout.ts');
      const configDir = path.join(tempDir, '.github');
      const expectedRelativePath = path.relative(configDir, absoluteOutputPath);
      
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: absoluteOutputPath
      });

      const actions = getActionsFromConfig();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.orgRepo).toBe('actions/checkout');
      expect(actions[0]!.ref).toBe('abc123def456');
      expect(actions[0]!.versionRef).toBe('v4');
      expect(actions[0]!.displayName).toBe('Checkout');
      
      
      // The stored outputPath should be relative to the config file
      expect(actions[0]!.outputPath).toBe(expectedRelativePath);
      
      // The resolved path should point to the same file as the original absolute path
      // We check that the paths represent the same file by normalizing both paths
      const resolvedPath = getResolvedOutputPath(actions[0]!);
      expect(path.basename(resolvedPath)).toBe(path.basename(absoluteOutputPath));
      expect(path.basename(path.dirname(resolvedPath))).toBe(path.basename(path.dirname(absoluteOutputPath)));
    });

    it('updates existing action with same orgRepo and ref', () => {
      const initialOutputPath = path.join(tempDir, 'actions', 'checkout.ts');
      const updatedOutputPath = path.join(tempDir, 'actions', 'checkout-v4.ts');
      const configDir = path.join(tempDir, '.github');
      const expectedRelativePath = path.relative(configDir, updatedOutputPath);
      
      // Add initial action
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: initialOutputPath
      });

      // Update same action
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout v4',
        outputPath: updatedOutputPath
      });

      const actions = getActionsFromConfig();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.versionRef).toBe('v4');
      expect(actions[0]!.displayName).toBe('Checkout v4');
      expect(actions[0]!.outputPath).toBe(expectedRelativePath);
      const resolvedPath = getResolvedOutputPath(actions[0]!);
      expect(path.basename(resolvedPath)).toBe(path.basename(updatedOutputPath));
      expect(path.basename(path.dirname(resolvedPath))).toBe(path.basename(path.dirname(updatedOutputPath)));
    });

    it('adds multiple actions and sorts them by orgRepo', () => {
      const setupNodePath = path.join(tempDir, 'actions', 'setup-node.ts');
      const checkoutPath = path.join(tempDir, 'actions', 'checkout.ts');
      const configDir = path.join(tempDir, '.github');
      const expectedCheckoutPath = path.relative(configDir, checkoutPath);
      const expectedSetupNodePath = path.relative(configDir, setupNodePath);
      
      addActionToConfig({
        orgRepo: 'actions/setup-node',
        ref: 'def456ghi789',
        versionRef: 'v3',
        displayName: 'Setup Node',
        outputPath: setupNodePath
      });

      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: checkoutPath
      });

      const actions = getActionsFromConfig();
      expect(actions).toHaveLength(2);
      expect(actions[0]!.orgRepo).toBe('actions/checkout'); // Should be sorted first
      expect(actions[1]!.orgRepo).toBe('actions/setup-node');
      
      // Check that paths are stored as relative
      expect(actions[0]!.outputPath).toBe(expectedCheckoutPath);
      expect(actions[1]!.outputPath).toBe(expectedSetupNodePath);
    });
  });

  describe('removeActionFromConfig', () => {
    beforeEach(() => {
      // Add test actions - only one per orgRepo since we now enforce this
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: path.join(tempDir, 'actions', 'checkout.ts')
      });

      addActionToConfig({
        orgRepo: 'actions/setup-node',
        ref: 'def456ghi789',
        versionRef: 'v3',
        displayName: 'Setup Node',
        outputPath: path.join(tempDir, 'actions', 'setup-node.ts')
      });

      addActionToConfig({
        orgRepo: 'actions/cache',
        ref: 'ghi789abc123',
        versionRef: 'v3',
        displayName: 'Cache',
        outputPath: path.join(tempDir, 'actions', 'cache.ts')
      });
    });

    it('removes action by orgRepo', () => {
      const removed = removeActionFromConfig('actions/checkout');
      
      expect(removed).toBe(true);
      const actions = getActionsFromConfig();
      expect(actions).toHaveLength(2);
      expect(actions.find(a => a.orgRepo === 'actions/checkout')).toBeUndefined();
    });

    it('removes different orgRepo action', () => {
      const removed = removeActionFromConfig('actions/setup-node');
      
      expect(removed).toBe(true);
      const actions = getActionsFromConfig();
      expect(actions).toHaveLength(2);
      expect(actions.find(a => a.orgRepo === 'actions/setup-node')).toBeUndefined();
    });

    it('returns false when action does not exist', () => {
      const removed = removeActionFromConfig('non/existent');
      
      expect(removed).toBe(false);
      expect(getActionsFromConfig()).toHaveLength(3); // No actions removed
    });
  });

  describe('updateOutputDir', () => {
    it('updates output directory in config', () => {
      updateOutputDir('custom/output/path');
      
      const config = readConfig();
      expect(config.outputDir).toBe('custom/output/path');
    });
  });

  describe('getActionsFromConfig', () => {
    it('returns empty array when no actions exist', () => {
      const actions = getActionsFromConfig();
      expect(actions).toEqual([]);
    });

    it('returns all actions', () => {
      const absolutePath = path.join(tempDir, 'actions', 'checkout.ts');
      const configDir = path.join(tempDir, '.github');
      const expectedRelativePath = path.relative(configDir, absolutePath);
      
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: absolutePath
      });

      const actions = getActionsFromConfig();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.orgRepo).toBe('actions/checkout');
      expect(actions[0]!.outputPath).toBe(expectedRelativePath);
    });
  });

  describe('config validation and migration', () => {
    it('handles missing optional fields gracefully', () => {
      const invalidConfig = {
        version: '1.0.0',
        outputDir: '.github/actions',
        actions: []
        // Missing options field
      };

      writeConfig(invalidConfig as any);
      const config = readConfig();

      expect(config.options!.tokenSource).toBe('env');
      expect(config.options!.formatting!.prettier).toBe(true);
    });

    it('filters out invalid actions during validation', () => {
      const configWithInvalidAction = {
        version: '1.0.0',
        outputDir: '.github/actions',
        actions: [
          {
            orgRepo: 'actions/checkout',
            ref: 'abc123def456',
            versionRef: 'v4',
            displayName: 'Checkout',
            outputPath: '/path/to/checkout.ts',
            addedAt: '2024-01-01T00:00:00.000Z'
          },
          {
            // Invalid action missing required fields
            orgRepo: 'incomplete/action'
            // Missing ref, filename, displayName
          }
        ]
      };

      writeConfig(configWithInvalidAction as any);
      const config = readConfig();

      expect(config.actions).toHaveLength(1);
      expect(config.actions[0]!.orgRepo).toBe('actions/checkout');
    });
  });

  describe('path resolution functions', () => {
    it('getActionsFromConfigWithResolvedPaths returns resolved absolute paths', () => {
      const absolutePath = path.join(tempDir, 'actions', 'checkout.ts');
      const configDir = path.join(tempDir, '.github');
      const expectedRelativePath = path.relative(configDir, absolutePath);
      
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: absolutePath
      });

      const actionsWithResolvedPaths = getActionsFromConfigWithResolvedPaths();
      expect(actionsWithResolvedPaths).toHaveLength(1);
      expect(actionsWithResolvedPaths[0]!.outputPath).toBe(expectedRelativePath); // relative
      const resolvedPath = actionsWithResolvedPaths[0]!.resolvedOutputPath;
      expect(path.basename(resolvedPath)).toBe(path.basename(absolutePath)); // absolute
      expect(path.basename(path.dirname(resolvedPath))).toBe(path.basename(path.dirname(absolutePath)));
    });

    it('getResolvedOutputPath returns absolute path from relative stored path', () => {
      const absolutePath = path.join(tempDir, 'actions', 'setup-node.ts');
      const configDir = path.join(tempDir, '.github');
      const expectedRelativePath = path.relative(configDir, absolutePath);
      
      addActionToConfig({
        orgRepo: 'actions/setup-node',
        ref: 'abc123def456',
        versionRef: 'v3',
        displayName: 'Setup Node',
        outputPath: absolutePath
      });

      const actions = getActionsFromConfig();
      const resolvedPath = getResolvedOutputPath(actions[0]!);
      
      expect(actions[0]!.outputPath).toBe(expectedRelativePath); // stored as relative
      expect(path.basename(resolvedPath)).toBe(path.basename(absolutePath)); // resolved to absolute
      expect(path.basename(path.dirname(resolvedPath))).toBe(path.basename(path.dirname(absolutePath)));
    });
  });

  describe('addActionToConfig - duplicate prevention', () => {
    it('should update existing action instead of creating duplicate when same orgRepo is used', () => {
      const absolutePath1 = path.join(tempDir, 'actions', 'checkout-v4.ts');
      const absolutePath2 = path.join(tempDir, 'actions', 'checkout-v5.ts');
      
      // Add first version of the action
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'sha123abc',
        versionRef: 'v4',
        displayName: 'Checkout v4',
        outputPath: absolutePath1
      });

      let actions = getActionsFromConfig();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.ref).toBe('sha123abc');
      expect(actions[0]!.versionRef).toBe('v4');
      expect(actions[0]!.displayName).toBe('Checkout v4');
      
      // Add same orgRepo with different ref - should update, not duplicate
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'v5',
        versionRef: 'v5',
        displayName: 'Checkout v5',
        outputPath: absolutePath2
      });

      actions = getActionsFromConfig();
      expect(actions).toHaveLength(1); // Should still only have one entry
      expect(actions[0]!.orgRepo).toBe('actions/checkout');
      expect(actions[0]!.ref).toBe('v5'); // Should be updated
      expect(actions[0]!.versionRef).toBe('v5'); // Should be updated
      expect(actions[0]!.displayName).toBe('Checkout v5'); // Should be updated
    });
  });
});