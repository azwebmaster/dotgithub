import { WorkflowConstruct } from '../../constructs/workflow';
import { JobConstruct } from '../../constructs/job';
import { createStep } from '../../actions';
import { BasePlugin } from './base-plugin';
import type { PluginContext } from '../types';

export interface CIPluginConfig {
  nodeVersions?: string[];
  testCommand?: string;
  buildCommand?: string;
  lintCommand?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  workingDirectory?: string;
  runOn?: string[];
  branches?: string[];
  pullRequest?: boolean;
  push?: boolean;
}

export class CIPlugin extends BasePlugin {
  override readonly name = 'ci';
  override readonly version = '1.0.0';
  override readonly description = 'Standard CI/CD workflow for Node.js projects';

  override validate(context: PluginContext): void {
    const config = context.config as CIPluginConfig;
    
    if (config.nodeVersions && !Array.isArray(config.nodeVersions)) {
      throw new Error('nodeVersions must be an array of strings');
    }
    
    if (config.packageManager && !['npm', 'pnpm', 'yarn', 'bun'].includes(config.packageManager)) {
      throw new Error('packageManager must be one of: npm, pnpm, yarn, bun');
    }
  }

  override apply(context: PluginContext): void {
    const config = context.config as CIPluginConfig;
    const { stack } = context;

    // Default configuration
    const nodeVersions = config.nodeVersions || ['18', '20'];
    const packageManager = config.packageManager || 'pnpm';
    const testCommand = config.testCommand || `${packageManager} test`;
    const buildCommand = config.buildCommand;
    const lintCommand = config.lintCommand;
    const workingDirectory = config.workingDirectory;
    const runOn = config.runOn || ['ubuntu-latest'];
    const branches = config.branches || ['main', 'master'];
    const enablePR = config.pullRequest !== false;
    const enablePush = config.push !== false;

    // Build trigger configuration
    const triggers: any = {};
    
    if (enablePush) {
      triggers.push = {
        branches: branches
      };
    }
    
    if (enablePR) {
      triggers.pull_request = {
        branches: branches
      };
    }

    // Create CI workflow
    const workflow = new WorkflowConstruct(stack, 'ci', {
      name: 'CI',
      on: triggers,
      permissions: {
        contents: 'read'
      }
    });

    // Create test job
    const testJob = new JobConstruct(workflow, 'test', {
      runsOn: runOn,
      strategy: {
        matrix: {
          'node-version': nodeVersions
        }
      },
      steps: [
        createStep('actions/checkout@v4', {
          name: 'Checkout code'
        }),
        
        createStep('actions/setup-node@v4', {
          name: 'Setup Node.js',
          with: {
            'node-version': '${{ matrix.node-version }}',
            ...(packageManager === 'pnpm' && { 'cache': 'pnpm' })
          }
        }),

        ...(packageManager === 'pnpm' ? [{
          name: 'Install pnpm',
          uses: 'pnpm/action-setup@v2',
          with: {
            version: 'latest'
          }
        }] : []),

        {
          name: 'Install dependencies',
          run: this.getInstallCommand(packageManager),
          ...(workingDirectory && { 'working-directory': workingDirectory })
        },

        ...(lintCommand ? [{
          name: 'Run lint',
          run: lintCommand,
          ...(workingDirectory && { 'working-directory': workingDirectory })
        }] : []),

        ...(buildCommand ? [{
          name: 'Build',
          run: buildCommand,
          ...(workingDirectory && { 'working-directory': workingDirectory })
        }] : []),

        {
          name: 'Run tests',
          run: testCommand,
          ...(workingDirectory && { 'working-directory': workingDirectory })
        }
      ]
    });

    workflow.addJob('test', testJob);
    
    // Store metadata for other plugins to use
    stack.setMetadata('ci', {
      enabled: true,
      nodeVersions,
      packageManager,
      hasTests: true,
      hasBuild: !!buildCommand,
      hasLint: !!lintCommand
    });
  }

  private getInstallCommand(packageManager: string): string {
    switch (packageManager) {
      case 'pnpm':
        return 'pnpm install';
      case 'yarn':
        return 'yarn install --frozen-lockfile';
      case 'bun':
        return 'bun install';
      case 'npm':
      default:
        return 'npm ci';
    }
  }
}

// Export plugin instance for easy import
export const ciPlugin = new CIPlugin();