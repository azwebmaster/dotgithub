import { describe, it, expect } from 'vitest';
import { generateWorkflowYaml, createWorkflow, createJob } from './workflow-generator.js';
import type { GitHubWorkflow, GitHubJob } from './types/workflow.js';

describe('workflow-generator', () => {
  describe('generateWorkflowYaml', () => {
    it('should generate basic workflow YAML', () => {
      const workflow: GitHubWorkflow = {
        name: 'CI',
        on: 'push',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                name: 'Checkout',
                uses: 'actions/checkout@v4'
              }
            ]
          }
        }
      };

      const yaml = generateWorkflowYaml(workflow);
      
      expect(yaml).toContain('name: CI');
      expect(yaml).toContain('"on": push');
      expect(yaml).toContain('runs-on: ubuntu-latest');
      expect(yaml).toContain('uses: actions/checkout@v4');
    });

    it('should handle complex workflow with all features', () => {
      const workflow: GitHubWorkflow = {
        name: 'Complex Workflow',
        'run-name': 'Running ${{ github.actor }} tests',
        on: {
          push: {
            branches: ['main', 'develop']
          },
          pull_request: {}
        },
        permissions: {
          contents: 'read',
          'pull-requests': 'write'
        },
        env: {
          NODE_VERSION: '18',
          CI: 'true'
        },
        concurrency: {
          group: '${{ github.workflow }}-${{ github.ref }}',
          'cancel-in-progress': true
        },
        jobs: {
          test: {
            name: 'Run Tests',
            'runs-on': 'ubuntu-latest',
            permissions: {
              contents: 'read'
            },
            env: {
              TEST_ENV: 'ci'
            },
            strategy: {
              matrix: {
                'node-version': ['16', '18', '20']
              },
              failFast: false
            },
            steps: [
              {
                name: 'Checkout code',
                uses: 'actions/checkout@v4'
              },
              {
                name: 'Setup Node.js',
                uses: 'actions/setup-node@v4',
                with: {
                  'node-version': '${{ matrix.node-version }}'
                }
              },
              {
                name: 'Install dependencies',
                run: 'npm install'
              },
              {
                name: 'Run tests',
                run: 'npm test',
                env: {
                  CI: 'true'
                }
              }
            ]
          }
        }
      };

      const yaml = generateWorkflowYaml(workflow);
      
      expect(yaml).toContain('name: Complex Workflow');
      expect(yaml).toContain('run-name: Running ${{ github.actor }} tests');
      expect(yaml).toContain('branches:');
      expect(yaml).toContain('- main');
      expect(yaml).toContain('- develop');
      expect(yaml).toContain('pull_request: {}');
      expect(yaml).toContain('contents: read');
      expect(yaml).toContain('pull-requests: write');
      expect(yaml).toContain('NODE_VERSION: "18"');
      expect(yaml).toContain('group: ${{ github.workflow }}-${{ github.ref }}');
      expect(yaml).toContain('cancel-in-progress: true');
      expect(yaml).toContain('node-version:');
      expect(yaml).toContain('- "16"');
      expect(yaml).toContain('- "18"');
      expect(yaml).toContain('- "20"');
    });

    it('should handle permissions as string', () => {
      const workflow: GitHubWorkflow = {
        on: 'push',
        permissions: 'read-all',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: []
          }
        }
      };

      const yaml = generateWorkflowYaml(workflow);
      expect(yaml).toContain('permissions: read-all');
    });

    it('should handle empty permissions object', () => {
      const workflow: GitHubWorkflow = {
        on: 'push',
        permissions: {},
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: []
          }
        }
      };

      const yaml = generateWorkflowYaml(workflow);
      expect(yaml).toContain('permissions: {}');
    });

    it('should convert camelCase to kebab-case for specific fields', () => {
      const workflow: GitHubWorkflow = {
        on: 'push',
        permissions: {
          'id-token': 'write',
          'pull-requests': 'read',
          'security-events': 'write'
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            'timeout-minutes': 30,
            'continue-on-error': true,
            steps: [
              {
                name: 'Test step',
                run: 'echo "test"',
                'continue-on-error': true,
                'timeout-minutes': 5,
                'working-directory': './src'
              }
            ]
          }
        }
      };

      const yaml = generateWorkflowYaml(workflow);
      expect(yaml).toContain('id-token: write');
      expect(yaml).toContain('pull-requests: read');
      expect(yaml).toContain('security-events: write');
      expect(yaml).toContain('timeout-minutes: 30');
      expect(yaml).toContain('continue-on-error: true');
      expect(yaml).toContain('working-directory: ./src');
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow with required fields', () => {
      const workflow = createWorkflow({
        on: 'push',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: []
          }
        }
      });

      expect(workflow.on).toBe('push');
      expect(workflow.jobs).toHaveProperty('test');
    });

    it('should throw error when missing "on" field', () => {
      expect(() => createWorkflow({
        jobs: {
          test: { 'runs-on': 'ubuntu-latest', steps: [] }
        }
      } as any)).toThrow('Workflow must specify "on" triggers');
    });

    it('should throw error when missing "jobs" field', () => {
      expect(() => createWorkflow({
        on: 'push'
      } as any)).toThrow('Workflow must specify "jobs"');
    });
  });

  describe('createJob', () => {
    it('should create job with all provided config', () => {
      const job = createJob({
        name: 'Test Job',
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout',
            uses: 'actions/checkout@v4'
          }
        ]
      });

      expect(job.name).toBe('Test Job');
      expect(job['runs-on']).toBe('ubuntu-latest');
      expect(job.steps).toHaveLength(1);
    });
  });
});