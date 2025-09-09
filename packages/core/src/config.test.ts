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
  getConfigPath,
  setConfigPath,
  createConfigFile
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
    
    // Force the config to use the temp directory by setting the config path explicitly
    setConfigPath(path.join(tempDir, '.github', 'dotgithub.json'));
  });

  afterEach(() => {
    // Restore original working directory and environment
    process.chdir(originalCwd);
    process.env = originalEnv;
    
    // Reset config path to use default discovery
    setConfigPath('');
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('createDefaultConfig', () => {
    it('creates a valid default config', () => {
      const config = createDefaultConfig();
      
      expect(config.version).toBe('1.0.0');
      expect(config.outputDir).toBe('src');
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
      expect(config.outputDir).toBe('src');
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
      // Create a test output file path within the config dir's outputDir
      const configDir = path.join(tempDir, '.github');
      const outputDir = path.join(configDir, 'src'); // outputDir 'src' relative to config file
      const absoluteOutputPath = path.join(outputDir, 'actions', 'checkout', 'checkout.ts');
      const expectedRelativePath = path.relative(outputDir, absoluteOutputPath); // Should be 'actions/checkout/checkout.ts'
      
      // Ensure the config file exists in the temp directory by calling readConfig() which will create it
      readConfig();
      
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: absoluteOutputPath
      }, 'src');

      const actions = getActionsFromConfig();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.orgRepo).toBe('actions/checkout');
      expect(actions[0]!.ref).toBe('abc123def456');
      expect(actions[0]!.versionRef).toBe('v4');
      expect(actions[0]!.displayName).toBe('Checkout');
      
      
      // The stored outputPath should be relative to the outputDir
      expect(actions[0]!.outputPath).toBe(expectedRelativePath);
      
      // The resolved path should point to the same file as the original absolute path
      // We check that the paths represent the same file by normalizing both paths
      const resolvedPath = getResolvedOutputPath(actions[0]!);
      expect(path.basename(resolvedPath)).toBe(path.basename(absoluteOutputPath));
      expect(path.basename(path.dirname(resolvedPath))).toBe(path.basename(path.dirname(absoluteOutputPath)));
    });

    it('updates existing action with same orgRepo and ref', () => {
      const configDir = path.join(tempDir, '.github');
      const outputDir = path.join(configDir, 'src'); // outputDir 'src' relative to config file
      const initialOutputPath = path.join(outputDir, 'actions', 'checkout', 'checkout.ts');
      const updatedOutputPath = path.join(outputDir, 'actions', 'checkout', 'checkout.ts');
      const expectedRelativePath = path.relative(outputDir, updatedOutputPath);
      
      // Ensure the config file exists in the temp directory
      readConfig();
      
      // Add initial action
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: initialOutputPath
      }, 'src');

      // Update same action
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout v4',
        outputPath: updatedOutputPath
      }, 'src');

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
      const configDir = path.join(tempDir, '.github');
      const outputDir = path.join(configDir, 'src'); // outputDir 'src' relative to config file
      const setupNodePath = path.join(outputDir, 'actions', 'setup-node', 'setup-node.ts');
      const checkoutPath = path.join(outputDir, 'actions', 'checkout', 'checkout.ts');
      const expectedCheckoutPath = path.relative(outputDir, checkoutPath);
      const expectedSetupNodePath = path.relative(outputDir, setupNodePath);
      
      // Ensure the config file exists in the temp directory
      readConfig();
      
      addActionToConfig({
        orgRepo: 'actions/setup-node',
        ref: 'def456ghi789',
        versionRef: 'v3',
        displayName: 'Setup Node',
        outputPath: setupNodePath
      }, 'src');

      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: checkoutPath
      }, 'src');

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
      const configDir = path.join(tempDir, '.github');
      const outputDir = path.join(configDir, 'src'); // outputDir 'src' relative to config file
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: path.join(outputDir, 'actions', 'checkout', 'checkout.ts')
      });

      addActionToConfig({
        orgRepo: 'actions/setup-node',
        ref: 'def456ghi789',
        versionRef: 'v3',
        displayName: 'Setup Node',
        outputPath: path.join(outputDir, 'actions', 'setup-node', 'setup-node.ts')
      });

      addActionToConfig({
        orgRepo: 'actions/cache',
        ref: 'ghi789abc123',
        versionRef: 'v3',
        displayName: 'Cache',
        outputPath: path.join(outputDir, 'actions', 'cache', 'cache.ts')
      }, 'src');
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
      const configDir = path.join(tempDir, '.github');
      const outputDir = path.join(configDir, 'src'); // outputDir 'src' relative to config file
      const absolutePath = path.join(outputDir, 'actions', 'checkout', 'checkout.ts');
      const expectedRelativePath = path.relative(outputDir, absolutePath);
      
      // Ensure the config file exists in the temp directory
      readConfig();
      
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: absolutePath
      }, 'src');

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
      const configDir = path.join(tempDir, '.github');
      const outputDir = path.join(configDir, 'src'); // outputDir 'src' relative to config file
      const absolutePath = path.join(outputDir, 'actions', 'checkout', 'checkout.ts');
      const expectedRelativePath = path.relative(outputDir, absolutePath);
      
      // Ensure the config file exists in the temp directory
      readConfig();
      
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'abc123def456',
        versionRef: 'v4',
        displayName: 'Checkout',
        outputPath: absolutePath
      }, 'src');

      const actionsWithResolvedPaths = getActionsFromConfigWithResolvedPaths();
      expect(actionsWithResolvedPaths).toHaveLength(1);
      expect(actionsWithResolvedPaths[0]!.outputPath).toBe(expectedRelativePath); // relative
      const resolvedPath = actionsWithResolvedPaths[0]!.resolvedOutputPath;
      expect(path.basename(resolvedPath)).toBe(path.basename(absolutePath)); // absolute
      expect(path.basename(path.dirname(resolvedPath))).toBe(path.basename(path.dirname(absolutePath)));
    });

    it('getResolvedOutputPath returns absolute path from relative stored path', () => {
      const configDir = path.join(tempDir, '.github');
      const outputDir = path.join(configDir, 'src'); // outputDir 'src' relative to config file
      const absolutePath = path.join(outputDir, 'actions', 'setup-node', 'setup-node.ts');
      const expectedRelativePath = path.relative(outputDir, absolutePath);
      
      // Ensure the config file exists in the temp directory
      readConfig();
      
      addActionToConfig({
        orgRepo: 'actions/setup-node',
        ref: 'abc123def456',
        versionRef: 'v3',
        displayName: 'Setup Node',
        outputPath: absolutePath
      }, 'src');

      const actions = getActionsFromConfig();
      const resolvedPath = getResolvedOutputPath(actions[0]!);
      
      expect(actions[0]!.outputPath).toBe(expectedRelativePath); // stored as relative
      expect(path.basename(resolvedPath)).toBe(path.basename(absolutePath)); // resolved to absolute
      expect(path.basename(path.dirname(resolvedPath))).toBe(path.basename(path.dirname(absolutePath)));
    });
  });

  describe('addActionToConfig - duplicate prevention', () => {
    it('should update existing action instead of creating duplicate when same orgRepo is used', () => {
      const configDir = path.join(tempDir, '.github');
      const outputDir = path.join(configDir, 'src'); // outputDir 'src' relative to config file
      const absolutePath1 = path.join(outputDir, 'actions', 'checkout', 'checkout.ts');
      const absolutePath2 = path.join(outputDir, 'actions', 'checkout', 'checkout.ts');
      
      // Add first version of the action
      addActionToConfig({
        orgRepo: 'actions/checkout',
        ref: 'sha123abc',
        versionRef: 'v4',
        displayName: 'Checkout v4',
        outputPath: absolutePath1
      }, 'src');

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
      }, 'src');

      actions = getActionsFromConfig();
      expect(actions).toHaveLength(1); // Should still only have one entry
      expect(actions[0]!.orgRepo).toBe('actions/checkout');
      expect(actions[0]!.ref).toBe('v5'); // Should be updated
      expect(actions[0]!.versionRef).toBe('v5'); // Should be updated
      expect(actions[0]!.displayName).toBe('Checkout v5'); // Should be updated
    });
  });

  describe('setConfigPath', () => {
    it('overrides config path discovery', () => {
      const customConfigPath = path.join(tempDir, 'custom-config.json');
      setConfigPath(customConfigPath);
      
      const configPath = getConfigPath();
      expect(configPath).toBe(path.resolve(customConfigPath));
    });
  });

  describe('multiple config formats', () => {
    beforeEach(() => {
      // Reset config path before each test to ensure clean state
      setConfigPath('');
    });
    
    afterEach(() => {
      // Reset config path after each test
      setConfigPath('');
    });

    describe('getConfigPath', () => {
      it('finds dotgithub.json first', () => {
        const jsonPath = path.join(tempDir, '.github', 'dotgithub.json');
        const yamlPath = path.join(tempDir, '.github', 'dotgithub.yaml');
        const jsPath = path.join(tempDir, '.github', 'dotgithub.js');
        
        // Create all three files
        fs.writeFileSync(jsonPath, '{}');
        fs.writeFileSync(yamlPath, 'version: "1.0.0"');
        fs.writeFileSync(jsPath, 'module.exports = {}');
        
        const configPath = getConfigPath();
        expect(path.basename(configPath)).toBe('dotgithub.json');
        expect(configPath).toContain('.github');
      });

      it('finds dotgithub.js when json does not exist', () => {
        const yamlPath = path.join(tempDir, '.github', 'dotgithub.yaml');
        const jsPath = path.join(tempDir, '.github', 'dotgithub.js');
        
        fs.writeFileSync(jsPath, 'module.exports = {}');
        fs.writeFileSync(yamlPath, 'version: "1.0.0"');
        
        const configPath = getConfigPath();
        expect(path.basename(configPath)).toBe('dotgithub.js');
        expect(configPath).toContain('.github');
      });

      it('finds dotgithub.yaml when json and js do not exist', () => {
        const yamlPath = path.join(tempDir, '.github', 'dotgithub.yaml');
        const ymlPath = path.join(tempDir, '.github', 'dotgithub.yml');
        
        fs.writeFileSync(yamlPath, 'version: "1.0.0"');
        fs.writeFileSync(ymlPath, 'version: "1.0.0"');
        
        const configPath = getConfigPath();
        expect(path.basename(configPath)).toBe('dotgithub.yaml');
        expect(configPath).toContain('.github');
      });

      it('finds dotgithub.yml when others do not exist', () => {
        const ymlPath = path.join(tempDir, '.github', 'dotgithub.yml');
        
        fs.writeFileSync(ymlPath, 'version: "1.0.0"');
        
        const configPath = getConfigPath();
        expect(path.basename(configPath)).toBe('dotgithub.yml');
        expect(configPath).toContain('.github');
      });
    });

    describe('createConfigFile', () => {
      it('creates JSON config file by default', () => {
        const configPath = createConfigFile();
        expect(fs.existsSync(configPath)).toBe(true);
        expect(path.basename(configPath)).toBe('dotgithub.json');
        
        const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        expect(content.version).toBe('1.0.0');
        expect(content.outputDir).toBe('src');
      });

      it('creates YAML config file', () => {
        const configPath = createConfigFile('yaml');
        expect(fs.existsSync(configPath)).toBe(true);
        expect(path.basename(configPath)).toBe('dotgithub.yaml');
        
        const content = fs.readFileSync(configPath, 'utf8');
        expect(content).toContain('version: 1.0.0');
        expect(content).toContain('outputDir: src');
      });

      it('creates YML config file', () => {
        const configPath = createConfigFile('yml');
        expect(fs.existsSync(configPath)).toBe(true);
        expect(path.basename(configPath)).toBe('dotgithub.yml');
      });

      it('creates JS config file', () => {
        const configPath = createConfigFile('js');
        expect(fs.existsSync(configPath)).toBe(true);
        expect(path.basename(configPath)).toBe('dotgithub.js');
        
        const content = fs.readFileSync(configPath, 'utf8');
        expect(content).toContain('module.exports =');
        expect(content).toContain('"version": "1.0.0"');
      });

      it('throws error if config file already exists', () => {
        const configPath = createConfigFile('json');
        expect(fs.existsSync(configPath)).toBe(true);
        
        expect(() => createConfigFile('json')).toThrow('Config file already exists');
      });
    });

    describe('readConfig with different formats', () => {
      it('reads YAML config', () => {
        const yamlPath = path.join(tempDir, '.github', 'dotgithub.yaml');
        const yamlContent = `version: "1.0.0"
outputDir: custom-output
actions: []
plugins: []
stacks: []
options:
  tokenSource: env
  formatting:
    prettier: true`;
        
        fs.writeFileSync(yamlPath, yamlContent);
        setConfigPath(yamlPath);
        
        const config = readConfig();
        expect(config.version).toBe('1.0.0');
        expect(config.outputDir).toBe('custom-output');
        expect(Array.isArray(config.actions)).toBe(true);
      });

      it('reads JS config', () => {
        const jsPath = path.join(tempDir, '.github', 'dotgithub.js');
        const jsContent = `module.exports = {
  version: "1.0.0",
  outputDir: "custom-js-output",
  actions: [],
  plugins: [],
  stacks: [],
  options: {
    tokenSource: "env",
    formatting: {
      prettier: true
    }
  }
};`;
        
        fs.writeFileSync(jsPath, jsContent);
        setConfigPath(jsPath);
        
        const config = readConfig();
        expect(config.version).toBe('1.0.0');
        expect(config.outputDir).toBe('custom-js-output');
        expect(Array.isArray(config.actions)).toBe(true);
      });
    });

    describe('writeConfig preserves format', () => {
      it('preserves YAML format when updating', () => {
        const yamlPath = createConfigFile('yaml');
        setConfigPath(yamlPath);
        
        const config = readConfig();
        config.outputDir = 'updated-output';
        writeConfig(config);
        
        const content = fs.readFileSync(yamlPath, 'utf8');
        expect(content).toContain('outputDir: updated-output');
        expect(content).toContain('version: 1.0.0');
      });

      it('preserves JS format when updating', () => {
        const jsPath = createConfigFile('js');
        setConfigPath(jsPath);
        
        const config = readConfig();
        config.outputDir = 'updated-js-output';
        writeConfig(config);
        
        const content = fs.readFileSync(jsPath, 'utf8');
        expect(content).toContain('module.exports =');
        expect(content).toContain('"outputDir": "updated-js-output"');
      });
    });
  });
});