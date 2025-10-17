import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StackSynthesizer } from './stack-synthesizer.js';
import { readConfig, writeConfig, setConfigPath, createDefaultConfig } from './config.js';
import { DotGithubContext } from './context.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { DotGithubConfig } from './config.js';

// Mock fs module
vi.mock('fs');
const mockedFs = vi.mocked(fs);

describe('StackSynthesizer', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    tmpDir = '/tmp/dotgithub-test';
    configPath = path.join(tmpDir, '.github', 'dotgithub.json');
    setConfigPath(configPath);

    // Mock fs operations
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);
    mockedFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === configPath) {
        const config: DotGithubConfig = {
          version: '1.0.0',
          outputDir: 'src',
          actions: [],
          plugins: [
            {
              name: 'ci',
              package: 'built-in',
              config: {
                nodeVersions: ['18', '20'],
                testCommand: 'bun test'
              }
            }
          ],
          stacks: [
            {
              name: 'main',
              plugins: ['ci']
            }
          ]
        };
        return JSON.stringify(config, null, 2);
      }
      return '';
    });
  });

  it('should create synthesizer with project root detection', () => {
    const config = createDefaultConfig();
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context });
    expect(synthesizer.getProjectRoot()).toBeDefined();
  });

  it('should create synthesizer with custom options', () => {
    const config = createDefaultConfig();
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({
      context,
      projectRoot: '/custom/path'
    });
    
    expect(synthesizer.getProjectRoot()).toBe('/custom/path');
  });

  it('should handle empty stacks configuration', async () => {
    // Mock empty stacks config
    mockedFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === configPath) {
        const config: DotGithubConfig = {
          ...createDefaultConfig(),
          plugins: [],
          stacks: []
        };
        return JSON.stringify(config, null, 2);
      }
      return '';
    });

    const config = createDefaultConfig();
    config.stacks = [];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });
    const results = await synthesizer.synthesizeAll();

    expect(results.success).toBe(true);
    expect(results.results).toHaveLength(0);
    expect(results.errors).toHaveLength(0);
  });

  it('should synthesize stack with mocked built-in plugins', async () => {
    const config = createDefaultConfig();
    config.stacks = [{
      name: 'test-stack',
      plugins: ['ci']
    }];
    config.plugins = [{
      name: 'ci',
      package: 'built-in',
      config: {}
    }];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });
    
    // Mock the plugin manager to use built-in plugins
    const pluginManager = synthesizer.getPluginManager();
    const originalLoadPlugins = pluginManager.loadPlugins.bind(pluginManager);
    
    vi.spyOn(pluginManager, 'loadPlugins').mockImplementation(async (configs) => {
      // Mock loading CI plugin
      return configs.map(config => ({
        plugin: {
          name: config.name,
          apply: (context: any) => {
            // Simple mock implementation that adds a workflow
            context.stack.addWorkflow('ci', {
              name: 'CI',
              on: { push: { branches: ['main'] } },
              jobs: {
                test: {
                  'runs-on': ['ubuntu-latest'],
                  steps: [
                    { uses: 'actions/checkout@v4' },
                    { run: 'pnpm test' }
                  ]
                }
              }
            });
          }
        },
        config,
        resolved: true
      }));
    });

    vi.spyOn(pluginManager, 'executePluginsForStack').mockImplementation(async (stack, stackConfig, pluginConfigs) => {
      // Apply the mock plugin
      stack.addWorkflow('ci', {
        name: 'CI',
        on: { push: { branches: ['main'] } },
        jobs: {
          test: {
            'runs-on': ['ubuntu-latest'],
            steps: [
              { uses: 'actions/checkout@v4' },
              { run: 'pnpm test' }
            ]
          }
        }
      });

      return [{
        plugin: { name: 'ci' } as any,
        success: true,
        duration: 100
      }];
    });

    const results = await synthesizer.synthesizeAll();

    expect(results.success).toBe(true);
    expect(results.results).toHaveLength(1);
    expect(results.errors).toHaveLength(0);

    const result = results.results[0];
    expect(result.stackConfig.name).toBe('test-stack');
    expect(result.stackConfig.plugins).toEqual(['ci']);
    expect(result.pluginResults).toHaveLength(1);
    expect(result.pluginResults[0].success).toBe(true);
    
    // Check generated files
    expect(Object.keys(result.files)).toContain('workflows/ci.yml');
    expect(result.files['workflows/ci.yml']).toContain('name: CI');
    expect(result.files['workflows/ci.yml']).toContain('runs-on:');
    expect(result.files['workflows/ci.yml']).toContain('- ubuntu-latest');
  });

  it('should handle plugin loading errors', async () => {
    const config = createDefaultConfig();
    config.stacks = [{
      name: 'test-stack',
      plugins: ['ci']
    }];
    config.plugins = [{
      name: 'ci',
      package: 'built-in',
      config: {}
    }];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });
    
    // Mock plugin manager to throw error during loading
    const pluginManager = synthesizer.getPluginManager();
    vi.spyOn(pluginManager, 'loadPlugins').mockRejectedValue(new Error('Failed to load plugin'));

    const results = await synthesizer.synthesizeAll();

    expect(results.success).toBe(false);
    expect(results.results).toHaveLength(0);
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].message).toBe('Failed to load plugin');
  });

  it('should handle plugin execution errors', async () => {
    const config = createDefaultConfig();
    config.stacks = [{
      name: 'test-stack',
      plugins: ['ci']
    }];
    config.plugins = [{
      name: 'ci',
      package: 'built-in',
      config: {}
    }];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });
    
    // Mock successful plugin loading but failed execution
    const pluginManager = synthesizer.getPluginManager();
    vi.spyOn(pluginManager, 'loadPlugins').mockResolvedValue([{
      plugin: { name: 'ci' } as any,
      config: { name: 'ci', package: 'built-in' },
      resolved: true
    }]);
    
    vi.spyOn(pluginManager, 'executePluginsForStack').mockRejectedValue(new Error('Plugin execution failed'));

    const results = await synthesizer.synthesizeAll();

    expect(results.success).toBe(false);
    expect(results.results).toHaveLength(0);
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].message).toBe('Plugin execution failed');
  });

  it('should write synthesized files', async () => {
    const config = createDefaultConfig();
    config.stacks = [{
      name: 'test-stack',
      plugins: ['ci']
    }];
    config.plugins = [{
      name: 'ci',
      package: 'built-in',
      config: {}
    }];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });
    
    // Mock successful synthesis
    const pluginManager = synthesizer.getPluginManager();
    vi.spyOn(pluginManager, 'loadPlugins').mockResolvedValue([{
      plugin: { name: 'ci' } as any,
      config: { name: 'ci', package: 'built-in' },
      resolved: true
    }]);
    
    vi.spyOn(pluginManager, 'executePluginsForStack').mockImplementation(async (stack) => {
      stack.addWorkflow('ci', {
        name: 'CI',
        on: { push: { branches: ['main'] } },
        jobs: {
          test: {
            'runs-on': ['ubuntu-latest'],
            steps: [{ uses: 'actions/checkout@v4' }]
          }
        }
      });
      
      return [{
        plugin: { name: 'ci' } as any,
        success: true,
        duration: 100
      }];
    });

    const results = await synthesizer.synthesizeAndWrite();

    expect(results.success).toBe(true);
    expect(results.results).toHaveLength(1);

    // Verify fs.writeFileSync was called
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('workflows/ci.yml'),
      expect.stringContaining('name: CI'),
      'utf8'
    );
    
    // Verify directory creation
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.github'),
      { recursive: true }
    );
  });
});