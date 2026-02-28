import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubStack } from '../constructs/base';
import { ConstructManager } from './manager.js';
import type { ConstructConfig, StackConfig, GitHubConstruct } from './types.js';

// Mock constructs for testing
const ciConstruct: GitHubConstruct = {
  name: 'ci',
  description: 'CI/CD workflow construct',
  validate(stack) {
    const config = stack.config || {};
    if (
      config.packageManager &&
      !['npm', 'yarn', 'pnpm', 'bun'].includes(config.packageManager)
    ) {
      throw new Error('packageManager must be one of: npm, yarn, pnpm, bun');
    }
  },
  async synthesize(stack) {
    const config = stack.config || {};
    const nodeVersions = (config.nodeVersions as string[]) || ['18', '20'];
    const packageManager = (config.packageManager as string) || 'npm';
    const testCommand =
      (config.testCommand as string) || `${packageManager} test`;
    const buildCommand = config.buildCommand as string | undefined;
    const lintCommand = config.lintCommand as string | undefined;

    const installCmd =
      packageManager === 'yarn'
        ? 'yarn install --frozen-lockfile'
        : `${packageManager} install`;

    const steps: any[] = [
      { uses: 'actions/checkout@v4' },
      {
        uses: 'actions/setup-node@v4',
        with: { 'node-version': '${{ matrix.node-version }}' },
      },
      { run: installCmd },
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
              'node-version': nodeVersions,
            },
          },
          steps,
        },
      },
    });

    stack.setMetadata('ci', {
      enabled: true,
      nodeVersions,
      packageManager,
      hasTests: true,
      hasBuild: !!buildCommand,
      hasLint: !!lintCommand,
    });
  },
};

const releaseConstruct: GitHubConstruct = {
  name: 'release',
  description: 'Release automation construct',
  dependencies: ['ci'],
  async synthesize(stack) {
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
            { run: 'npx release-it' },
          ],
        },
      },
    });
  },
};

describe('Construct System', () => {
  let manager: ConstructManager;
  let stack: GitHubStack;

  beforeEach(() => {
    manager = new ConstructManager({ projectRoot: '/tmp' });
    stack = new GitHubStack(undefined, 'test-stack');
  });

  describe('ConstructManager', () => {
    it('should load built-in constructs', async () => {
      const constructConfigs: ConstructConfig[] = [
        {
          name: 'ci',
          package: '@dotgithub/construct-ci',
          config: {
            nodeVersions: ['18', '20'],
            testCommand: 'bun test',
          },
        },
      ];

      // Mock the resolver to return our built-in construct
      const originalResolver = (manager as any).resolver;
      (manager as any).resolver = {
        resolveConstructs: async () => [
          {
            construct: ciConstruct,
            config: constructConfigs[0],
            resolved: true,
          },
        ],
      };

      const results = await manager.loadConstructs(constructConfigs);

      expect(results).toHaveLength(1);
      expect(results[0].resolved).toBe(true);
      expect(results[0].construct.name).toBe('ci');
      expect(manager.isConstructLoaded('ci')).toBe(true);
    });

    it('should execute constructs for stack', async () => {
      // Load CI construct
      const constructConfigs: ConstructConfig[] = [
        {
          name: 'ci',
          package: '@dotgithub/plugin-ci',
          config: {
            nodeVersions: ['18', '20'],
            testCommand: 'bun test',
            buildCommand: 'bun run build',
          },
        },
      ];

      const stackConfig: StackConfig = {
        name: 'test-stack',
        constructs: ['ci'],
      };

      // Mock the resolver to return our built-in construct
      const originalResolver = (manager as any).resolver;
      (manager as any).resolver = {
        resolveConstructs: async () => [
          {
            construct: ciConstruct,
            config: constructConfigs[0],
            resolved: true,
          },
        ],
      };

      await manager.loadConstructs(constructConfigs);
      const results = await manager.executeConstructsForStack(
        stack,
        stackConfig,
        constructConfigs
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].construct.name).toBe('ci');
      expect(results[0].duration).toBeGreaterThanOrEqual(0);

      // Check that the construct added a workflow
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

    it('should validate construct dependencies', async () => {
      const constructConfigs: ConstructConfig[] = [
        {
          name: 'release',
          package: '@dotgithub/plugin-release',
          config: {},
        },
      ];

      const stackConfig: StackConfig = {
        name: 'test-stack',
        constructs: ['release'], // Missing 'ci' dependency
      };

      // Mock the resolver to return the release construct
      (manager as any).resolver = {
        resolveConstructs: async () => [
          {
            construct: releaseConstruct,
            config: constructConfigs[0],
            resolved: true,
          },
        ],
      };

      await manager.loadConstructs(constructConfigs);

      await expect(
        manager.executeConstructsForStack(stack, stackConfig, constructConfigs)
      ).rejects.toThrow('depends on "ci" which is not included in the stack');
    });

    it('should handle construct validation errors', async () => {
      const constructConfigs: ConstructConfig[] = [
        {
          name: 'ci',
          package: '@dotgithub/plugin-ci',
          config: {
            packageManager: 'invalid', // Invalid package manager
          },
        },
      ];

      const stackConfig: StackConfig = {
        name: 'test-stack',
        constructs: ['ci'],
      };

      // Mock the resolver
      (manager as any).resolver = {
        resolveConstructs: async () => [
          {
            construct: ciConstruct,
            config: constructConfigs[0],
            resolved: true,
          },
        ],
      };

      await manager.loadConstructs(constructConfigs);

      await expect(
        manager.executeConstructsForStack(stack, stackConfig, constructConfigs)
      ).rejects.toThrow('packageManager must be one of: npm, yarn, pnpm, bun');
    });
  });

  describe('Built-in Constructs', () => {
    describe('CI Construct', () => {
      it('should create CI workflow with default settings', async () => {
        stack.config = {};
        stack.stackConfig = { name: 'test', constructs: ['ci'] };
        stack.projectRoot = '/tmp';
        await ciConstruct.synthesize(stack);

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

      it('should create CI workflow with custom settings', async () => {
        stack.config = {
          nodeVersions: ['16', '18'],
          packageManager: 'yarn',
          testCommand: 'yarn test:ci',
          buildCommand: 'yarn build',
          lintCommand: 'yarn lint',
        };
        stack.stackConfig = { name: 'test', constructs: ['ci'] };
        stack.projectRoot = '/tmp';
        await ciConstruct.synthesize(stack);

        const ciWorkflow = stack.workflows.ci;
        const testJob = ciWorkflow.jobs.test;

        expect(testJob.strategy?.matrix['node-version']).toEqual(['16', '18']);
        expect(testJob.steps).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ run: 'yarn install --frozen-lockfile' }),
            expect.objectContaining({ run: 'yarn lint' }),
            expect.objectContaining({ run: 'yarn build' }),
            expect.objectContaining({ run: 'yarn test:ci' }),
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

    describe('Release Construct', () => {
      it('should create release workflow with default settings', async () => {
        // First apply CI construct to satisfy dependency
        stack.config = {};
        stack.stackConfig = { name: 'test', constructs: ['ci', 'release'] };
        stack.projectRoot = '/tmp';
        await ciConstruct.synthesize(stack);

        await releaseConstruct.synthesize(stack);

        const workflows = stack.workflows;
        expect(Object.keys(workflows)).toContain('release');

        const releaseWorkflow = workflows.release;
        expect(releaseWorkflow.name).toBe('Release');
        expect(releaseWorkflow.on).toHaveProperty('push');
        expect(releaseWorkflow.jobs).toHaveProperty('release');

        const releaseJob = releaseWorkflow.jobs.release;
        expect(releaseJob['runs-on']).toEqual(['ubuntu-latest']);

        const steps = releaseJob.steps;
        expect(
          steps.some(
            (step: any) =>
              step.uses && step.uses.startsWith('actions/checkout@')
          )
        ).toBe(true);
        expect(steps.some((step: any) => step.run === 'npx release-it')).toBe(
          true
        );
      });
    });
  });
});
