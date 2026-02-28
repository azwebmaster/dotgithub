import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StackSynthesizer } from './stack-synthesizer.js';
import {
  readConfig,
  writeConfig,
  setConfigPath,
  createDefaultConfig,
} from './config.js';
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
          constructs: [
            {
              name: 'ci',
              package: 'built-in',
              config: {
                nodeVersions: ['18', '20'],
                testCommand: 'bun test',
              },
            },
          ],
          stacks: [
            {
              name: 'main',
              constructs: ['ci'],
            },
          ],
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
      projectRoot: '/custom/path',
    });

    expect(synthesizer.getProjectRoot()).toBe('/custom/path');
  });

  it('should handle empty stacks configuration', async () => {
    // Mock empty stacks config
    mockedFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === configPath) {
        const config: DotGithubConfig = {
          ...createDefaultConfig(),
          constructs: [],
          stacks: [],
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

  it('should synthesize stack with mocked built-in constructs', async () => {
    const config = createDefaultConfig();
    config.stacks = [
      {
        name: 'test-stack',
        constructs: ['ci'],
      },
    ];
    config.constructs = [
      {
        name: 'ci',
        package: 'built-in',
        config: {},
      },
    ];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });

    // Mock the construct manager to use built-in constructs
    const constructManager = synthesizer.getConstructManager();
    const originalLoadConstructs = constructManager.loadConstructs.bind(
      constructManager
    );

    vi.spyOn(constructManager, 'loadConstructs').mockImplementation(
      async (configs) => {
        return configs.map((config) => ({
          construct: {
            name: config.name,
            synthesize: async (stack: any) => {
              stack.addWorkflow('ci', {
                name: 'CI',
                on: { push: { branches: ['main'] } },
                jobs: {
                  test: {
                    'runs-on': ['ubuntu-latest'],
                    steps: [
                      { uses: 'actions/checkout@v4' },
                      { run: 'pnpm test' },
                    ],
                  },
                },
              });
            },
          },
          config,
          resolved: true,
        }));
      }
    );

    vi.spyOn(constructManager, 'executeConstructsForStack').mockImplementation(
      async (stack, stackConfig, constructConfigs) => {
        stack.addWorkflow('ci', {
          name: 'CI',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': ['ubuntu-latest'],
              steps: [{ uses: 'actions/checkout@v4' }, { run: 'pnpm test' }],
            },
          },
        });

        return [
          {
            construct: { name: 'ci' } as any,
            success: true,
            duration: 100,
          },
        ];
      }
    );

    const results = await synthesizer.synthesizeAll();

    expect(results.success).toBe(true);
    expect(results.results).toHaveLength(1);
    expect(results.errors).toHaveLength(0);

    const result = results.results[0];
    expect(result.stackConfig.name).toBe('test-stack');
    expect(result.stackConfig.constructs).toEqual(['ci']);
    expect(result.constructResults).toHaveLength(1);
    expect(result.constructResults[0].success).toBe(true);

    // Check generated files
    expect(Object.keys(result.files)).toContain('workflows/ci.yml');
    expect(result.files['workflows/ci.yml']).toContain('name: CI');
    expect(result.files['workflows/ci.yml']).toContain('runs-on:');
    expect(result.files['workflows/ci.yml']).toContain('- ubuntu-latest');
  });

  it('should handle construct loading errors', async () => {
    const config = createDefaultConfig();
    config.stacks = [
      {
        name: 'test-stack',
        constructs: ['ci'],
      },
    ];
    config.constructs = [
      {
        name: 'ci',
        package: 'built-in',
        config: {},
      },
    ];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });

    // Mock construct manager to throw error during loading
    const constructManager = synthesizer.getConstructManager();
    vi.spyOn(constructManager, 'loadConstructs').mockRejectedValue(
      new Error('Failed to load construct')
    );

    const results = await synthesizer.synthesizeAll();

    expect(results.success).toBe(false);
    expect(results.results).toHaveLength(0);
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].message).toBe('Failed to load construct');
  });

  it('should handle construct execution errors', async () => {
    const config = createDefaultConfig();
    config.stacks = [
      {
        name: 'test-stack',
        constructs: ['ci'],
      },
    ];
    config.constructs = [
      {
        name: 'ci',
        package: 'built-in',
        config: {},
      },
    ];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });

    // Mock successful construct loading but failed execution
    const constructManager = synthesizer.getConstructManager();
    vi.spyOn(constructManager, 'loadConstructs').mockResolvedValue([
      {
        construct: { name: 'ci' } as any,
        config: { name: 'ci', package: 'built-in' },
        resolved: true,
      },
    ]);

    vi.spyOn(constructManager, 'executeConstructsForStack').mockRejectedValue(
      new Error('Construct execution failed')
    );

    const results = await synthesizer.synthesizeAll();

    expect(results.success).toBe(false);
    expect(results.results).toHaveLength(0);
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].message).toBe('Construct execution failed');
  });

  it('should write synthesized files', async () => {
    const config = createDefaultConfig();
    config.stacks = [
      {
        name: 'test-stack',
        constructs: ['ci'],
      },
    ];
    config.constructs = [
      {
        name: 'ci',
        package: 'built-in',
        config: {},
      },
    ];
    const context = new DotGithubContext({ config, configPath });
    const synthesizer = new StackSynthesizer({ context, projectRoot: tmpDir });

    // Mock successful synthesis
    const constructManager = synthesizer.getConstructManager();
    vi.spyOn(constructManager, 'loadConstructs').mockResolvedValue([
      {
        construct: { name: 'ci' } as any,
        config: { name: 'ci', package: 'built-in' },
        resolved: true,
      },
    ]);

    vi.spyOn(constructManager, 'executeConstructsForStack').mockImplementation(
      async (stack) => {
        stack.addWorkflow('ci', {
          name: 'CI',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': ['ubuntu-latest'],
              steps: [{ uses: 'actions/checkout@v4' }],
            },
          },
        });

        return [
          {
            construct: { name: 'ci' } as any,
            success: true,
            duration: 100,
          },
        ];
      }
    );

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
