import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubStack } from '../constructs/base';
import { SharedWorkflowHelper } from './shared-workflow-helper.js';
import type { PluginContext } from './types.js';

describe('SharedWorkflowHelper', () => {
  let stack: GitHubStack;
  let context: PluginContext;
  let helper: SharedWorkflowHelper;

  beforeEach(() => {
    stack = new GitHubStack();
    context = {
      stack,
      config: {},
      stackConfig: { name: 'test', plugins: [] },
      projectRoot: '/test',
      actions: {} as any,
      sharedWorkflows: {} as any
    };
    helper = new SharedWorkflowHelper(context);
  });

  describe('create', () => {
    it('should create a shared workflow with typed inputs', () => {
      const inputs = {
        nodeVersion: {
          type: 'string' as const,
          description: 'Node.js version',
          required: false,
          default: '20'
        },
        testCommand: {
          type: 'string' as const,
          description: 'Test command',
          required: true
        }
      };

      const workflow = {
        name: 'Test Workflow',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                name: 'Run tests',
                run: '${{ inputs.testCommand }}'
              }
            ]
          }
        }
      };

      const sharedWorkflow = helper.create('test-workflow', inputs, workflow);

      expect(sharedWorkflow).toBeDefined();
      expect(sharedWorkflow.workflow.name).toBe('Test Workflow');
      expect(sharedWorkflow.workflow.on).toBe('workflow_call');
      expect(sharedWorkflow.inputs).toEqual(inputs);
    });

    it('should create a job that calls the shared workflow', () => {
      const inputs = {
        nodeVersion: {
          type: 'string' as const,
          description: 'Node.js version',
          required: false,
          default: '20'
        }
      };

      const workflow = {
        name: 'Test Workflow',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: []
          }
        }
      };

      const sharedWorkflow = helper.create('test-workflow', inputs, workflow);
      const job = sharedWorkflow.createJob({
        nodeVersion: '18'
      }, {
        'runs-on': 'ubuntu-latest'
      });

      expect(job.uses).toBe('.github/workflows/test-workflow.yml');
      expect(job.with).toEqual({ nodeVersion: '18' });
      expect(job['runs-on']).toBe('ubuntu-latest');
    });
  });

  describe('createSimple', () => {
    it('should create a simple shared workflow', () => {
      const inputs = {
        testCommand: {
          type: 'string' as const,
          description: 'Test command',
          required: true
        }
      };

      const jobConfig = {
        name: 'Simple Test',
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Run tests',
            run: '${{ inputs.testCommand }}'
          }
        ]
      };

      const sharedWorkflow = helper.createSimple('simple-test', inputs, jobConfig);

      expect(sharedWorkflow.workflow.name).toBe('Simple Test');
      expect(sharedWorkflow.workflow.jobs['simple-test']).toBeDefined();
      expect(sharedWorkflow.workflow.jobs['simple-test']['runs-on']).toBe('ubuntu-latest');
    });
  });

  describe('createNodeTest', () => {
    it('should create a Node.js test workflow', () => {
      const inputs = {
        nodeVersion: {
          type: 'string' as const,
          description: 'Node.js version',
          required: false,
          default: '20'
        },
        testCommand: {
          type: 'string' as const,
          description: 'Test command',
          required: false,
          default: 'npm test'
        }
      };

      const sharedWorkflow = helper.createNodeTest('node-test', inputs);

      expect(sharedWorkflow.workflow.name).toBe('Node.js Test - node-test');
      expect(sharedWorkflow.workflow.jobs['node-test']).toBeDefined();
      
      const job = sharedWorkflow.workflow.jobs['node-test'];
      expect(job.steps).toHaveLength(4); // checkout, setup-node, install, test
      expect(job.steps![0].uses).toBe('actions/checkout@v4');
      expect(job.steps![1].uses).toBe('actions/setup-node@v4');
    });

    it('should include custom steps in Node.js test workflow', () => {
      const inputs = {
        nodeVersion: {
          type: 'string' as const,
          description: 'Node.js version',
          required: false,
          default: '20'
        }
      };

      const customSteps = [
        {
          name: 'Lint',
          run: 'npm run lint'
        }
      ];

      const sharedWorkflow = helper.createNodeTest('node-test', inputs, customSteps);

      const job = sharedWorkflow.workflow.jobs['node-test'];
      expect(job.steps).toHaveLength(5); // checkout, setup-node, install, lint, test
      expect(job.steps![3].name).toBe('Lint');
      expect(job.steps![3].run).toBe('npm run lint');
    });
  });

  describe('createBuildPublish', () => {
    it('should create a build and publish workflow', () => {
      const inputs = {
        nodeVersion: {
          type: 'string' as const,
          description: 'Node.js version',
          required: false,
          default: '20'
        },
        buildCommand: {
          type: 'string' as const,
          description: 'Build command',
          required: false,
          default: 'npm run build'
        }
      };

      const sharedWorkflow = helper.createBuildPublish('build-publish', inputs);

      expect(sharedWorkflow.workflow.name).toBe('Build and Publish - build-publish');
      expect(sharedWorkflow.workflow.jobs['build-publish']).toBeDefined();
      
      const job = sharedWorkflow.workflow.jobs['build-publish'];
      expect(job.steps).toHaveLength(5); // checkout, setup-node, install, build, publish
      expect(job.steps![3].name).toBe('Build');
      expect(job.steps![4].name).toBe('Publish');
    });
  });
});
