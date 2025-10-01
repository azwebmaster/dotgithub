import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubStack } from '../constructs/base';
import { PluginManager } from './manager';
import type { PluginConfig, StackConfig, DotGitHubPlugin } from './types';

// Mock plugins for testing
const ciPlugin: DotGitHubPlugin = {
  name: 'ci',
  description: 'CI/CD workflow plugin',
  validate(context) {
    if (context.config.packageManager && !['npm', 'yarn', 'pnpm', 'bun'].includes(context.config.packageManager)) {
      throw new Error('packageManager must be one of: npm, yarn, pnpm, bun');
    }
  },
  synthesize(context) {
    const { stack, config } = context;
    const nodeVersions = config.nodeVersions || ['18', '20'];
    const packageManager = config.packageManager || 'npm';
    const testCommand = config.testCommand || `${packageManager} test`;
    const buildCommand = config.buildCommand;
    const lintCommand = config.lintCommand;

    const installCmd = packageManager === 'yarn' ? 'yarn install --frozen-lockfile' : `${packageManager} install`;
    
    const steps: any[] = [
      { uses: 'actions/checkout@v4' },
      { uses: 'actions/setup-node@v4', with: { 'node-version': '${{ matrix.node-version }}' } },
      { run: installCmd }
    ];

    if (lintCommand) {
      steps.push({ run: lintCommand });
    }
    if (buildCommand) {
      steps.push({ run: buildCommand });
    }
    steps.push({ run: testCommand });

    stack.addWorkflow('ci', {
      name: 'CI',
      on: { push: {}, pull_request: {} },
      jobs: {
        test: {
          'runs-on': ['ubuntu-latest'],
          strategy: {
            matrix: {
              'node-version': nodeVersions
            }
          },
          steps
        }
      }
    });

    stack.setMetadata('ci', {
      enabled: true,
      nodeVersions,
      packageManager,
      hasTests: true,
      hasBuild: !!buildCommand,
      hasLint: !!lintCommand
    });
  }
};

const releasePlugin: DotGitHubPlugin = {
  name: 'release',
  description: 'Release automation plugin',
  dependencies: ['ci'],
  synthesize(context) {
    const { stack } = context;
    
    stack.addWorkflow('release', {
      name: 'Release',
      on: { push: { branches: ['main'] } },
      jobs: {
        release: {
          'runs-on': ['ubuntu-latest'],
          steps: [
            { uses: 'actions/checkout@v4' },
            { uses: 'actions/setup-node@v4', with: { 'node-version': '20' } },
            { run: 'npm install' },
            { run: 'npx release-it' }
          ]
        }
      }
    });
  }
};

describe('Plugin System', () => {
  let manager: PluginManager;
  let stack: GitHubStack;

  beforeEach(() => {
    manager = new PluginManager({ projectRoot: '/tmp' });
    stack = new GitHubStack(undefined, 'test-stack');
  });

  describe('PluginManager', () => {
    it('should load built-in plugins', async () => {
      const pluginConfigs: PluginConfig[] = [
        {
          name: 'ci',
          package: '@dotgithub/plugin-ci',
          config: {
            nodeVersions: ['18', '20'],
            testCommand: 'bun test'
          }
        }
      ];

      // Mock the resolver to return our built-in plugin
      const originalResolver = (manager as any).resolver;
      (manager as any).resolver = {
        resolvePlugins: async () => [{
          plugin: ciPlugin,
          config: pluginConfigs[0],
          resolved: true
        }]
      };

      const results = await manager.loadPlugins(pluginConfigs);
      
      expect(results).toHaveLength(1);
      expect(results[0].resolved).toBe(true);
      expect(results[0].plugin.name).toBe('ci');
      expect(manager.isPluginLoaded('ci')).toBe(true);
    });

    it('should execute plugins for stack', async () => {
      // Load CI plugin
      const pluginConfigs: PluginConfig[] = [
        {
          name: 'ci',
          package: '@dotgithub/plugin-ci',
          config: {
            nodeVersions: ['18', '20'],
            testCommand: 'bun test',
            buildCommand: 'bun run build'
          }
        }
      ];

      const stackConfig: StackConfig = {
        name: 'test-stack',
        plugins: ['ci']
      };

      // Mock the resolver to return our built-in plugin
      const originalResolver = (manager as any).resolver;
      (manager as any).resolver = {
        resolvePlugins: async () => [{
          plugin: ciPlugin,
          config: pluginConfigs[0],
          resolved: true
        }]
      };

      await manager.loadPlugins(pluginConfigs);
      const results = await manager.executePluginsForStack(stack, stackConfig, pluginConfigs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].plugin.name).toBe('ci');
      expect(results[0].duration).toBeGreaterThanOrEqual(0);

      // Check that the plugin added a workflow
      const workflows = stack.workflows;
      expect(Object.keys(workflows)).toContain('ci');
      
      const ciWorkflow = workflows.ci;
      expect(ciWorkflow.name).toBe('CI');
      expect(ciWorkflow.jobs).toHaveProperty('test');

      // Check that metadata was set
      expect(stack.hasMetadata('ci')).toBe(true);
      const ciMetadata = stack.getMetadata('ci');
      expect(ciMetadata.enabled).toBe(true);
      expect(ciMetadata.nodeVersions).toEqual(['18', '20']);
      expect(ciMetadata.hasTests).toBe(true);
      expect(ciMetadata.hasBuild).toBe(true);
    });

    it('should validate plugin dependencies', async () => {
      const pluginConfigs: PluginConfig[] = [
        {
          name: 'release',
          package: '@dotgithub/plugin-release',
          config: {}
        }
      ];

      const stackConfig: StackConfig = {
        name: 'test-stack',
        plugins: ['release'] // Missing 'ci' dependency
      };

      // Mock the resolver to return the release plugin
      (manager as any).resolver = {
        resolvePlugins: async () => [{
          plugin: releasePlugin,
          config: pluginConfigs[0],
          resolved: true
        }]
      };

      await manager.loadPlugins(pluginConfigs);

      await expect(
        manager.executePluginsForStack(stack, stackConfig, pluginConfigs)
      ).rejects.toThrow('depends on "ci" which is not included in the stack');
    });

    it('should handle plugin validation errors', async () => {
      const pluginConfigs: PluginConfig[] = [
        {
          name: 'ci',
          package: '@dotgithub/plugin-ci',
          config: {
            packageManager: 'invalid' // Invalid package manager
          }
        }
      ];

      const stackConfig: StackConfig = {
        name: 'test-stack',
        plugins: ['ci']
      };

      // Mock the resolver
      (manager as any).resolver = {
        resolvePlugins: async () => [{
          plugin: ciPlugin,
          config: pluginConfigs[0],
          resolved: true
        }]
      };

      await manager.loadPlugins(pluginConfigs);

      await expect(
        manager.executePluginsForStack(stack, stackConfig, pluginConfigs)
      ).rejects.toThrow('packageManager must be one of: npm, yarn, pnpm, bun');
    });
  });

  describe('Built-in Plugins', () => {
    describe('CI Plugin', () => {
      it('should create CI workflow with default settings', () => {
        const context = {
          stack,
          config: {},
          stackConfig: { name: 'test', plugins: ['ci'] },
          projectRoot: '/tmp'
        };

        ciPlugin.synthesize(context);

        const workflows = stack.workflows;
        expect(Object.keys(workflows)).toContain('ci');
        
        const ciWorkflow = workflows.ci;
        expect(ciWorkflow.name).toBe('CI');
        expect(ciWorkflow.on).toHaveProperty('push');
        expect(ciWorkflow.on).toHaveProperty('pull_request');
        expect(ciWorkflow.jobs).toHaveProperty('test');

        const testJob = ciWorkflow.jobs.test;
        expect(testJob['runs-on']).toEqual(['ubuntu-latest']);
        expect(testJob.strategy?.matrix).toHaveProperty('node-version');
        expect(testJob.strategy?.matrix['node-version']).toEqual(['18', '20']);
      });

      it('should create CI workflow with custom settings', () => {
        const context = {
          stack,
          config: {
            nodeVersions: ['16', '18'],
            packageManager: 'yarn',
            testCommand: 'yarn test:ci',
            buildCommand: 'yarn build',
            lintCommand: 'yarn lint'
          },
          stackConfig: { name: 'test', plugins: ['ci'] },
          projectRoot: '/tmp'
        };

        ciPlugin.synthesize(context);

        const ciWorkflow = stack.workflows.ci;
        const testJob = ciWorkflow.jobs.test;
        
        expect(testJob.strategy?.matrix['node-version']).toEqual(['16', '18']);
        expect(testJob.steps).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ run: 'yarn install --frozen-lockfile' }),
            expect.objectContaining({ run: 'yarn lint' }),
            expect.objectContaining({ run: 'yarn build' }),
            expect.objectContaining({ run: 'yarn test:ci' })
          ])
        );

        // Check metadata
        const ciMetadata = stack.getMetadata('ci');
        expect(ciMetadata.packageManager).toBe('yarn');
        expect(ciMetadata.nodeVersions).toEqual(['16', '18']);
        expect(ciMetadata.hasLint).toBe(true);
        expect(ciMetadata.hasBuild).toBe(true);
      });
    });

    describe('Release Plugin', () => {
      it('should create release workflow with default settings', () => {
        // First apply CI plugin to satisfy dependency
        ciPlugin.synthesize({
          stack,
          config: {},
          stackConfig: { name: 'test', plugins: ['ci', 'release'] },
          projectRoot: '/tmp'
        });

        const context = {
          stack,
          config: {},
          stackConfig: { name: 'test', plugins: ['ci', 'release'] },
          projectRoot: '/tmp'
        };

        releasePlugin.synthesize(context);

        const workflows = stack.workflows;
        expect(Object.keys(workflows)).toContain('release');
        
        const releaseWorkflow = workflows.release;
        expect(releaseWorkflow.name).toBe('Release');
        expect(releaseWorkflow.on).toHaveProperty('push');
        expect(releaseWorkflow.jobs).toHaveProperty('release');

        const releaseJob = releaseWorkflow.jobs.release;
        expect(releaseJob['runs-on']).toEqual(['ubuntu-latest']);
        
        const steps = releaseJob.steps;
        expect(steps.some((step: any) => step.uses && step.uses.startsWith('actions/checkout@'))).toBe(true);
        expect(steps.some((step: any) => step.run === 'npx release-it')).toBe(true);
      });
    });
  });
});