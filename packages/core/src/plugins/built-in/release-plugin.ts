import { WorkflowConstruct } from '../../constructs/workflow';
import { JobConstruct } from '../../constructs/job';
import { createStep } from '../../actions';
import { BasePlugin } from './base-plugin';
import type { PluginContext } from '../types';

export interface ReleasePluginConfig {
  branches?: string[];
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  buildCommand?: string;
  registry?: string;
  workingDirectory?: string;
  releaseIt?: boolean;
  semanticRelease?: boolean;
  customReleaseCommand?: string;
  nodeVersion?: string;
}

export class ReleasePlugin extends BasePlugin {
  override readonly name = 'release';
  override readonly version = '1.0.0';
  override readonly description = 'Automated release workflow for Node.js packages';
  override readonly dependencies = ['ci'];

  override validate(context: PluginContext): void {
    const config = context.config as ReleasePluginConfig;
    
    if (config.packageManager && !['npm', 'pnpm', 'yarn', 'bun'].includes(config.packageManager)) {
      throw new Error('packageManager must be one of: npm, pnpm, yarn, bun');
    }

    const releaseTools = [config.releaseIt, config.semanticRelease, config.customReleaseCommand].filter(Boolean);
    if (releaseTools.length > 1) {
      throw new Error('Only one release tool can be enabled: releaseIt, semanticRelease, or customReleaseCommand');
    }
  }

  override apply(context: PluginContext): void {
    const config = context.config as ReleasePluginConfig;
    const { stack } = context;

    // Default configuration
    const branches = config.branches || ['main', 'master'];
    const packageManager = config.packageManager || 'pnpm';
    const buildCommand = config.buildCommand;
    const registry = config.registry || 'https://registry.npmjs.org';
    const workingDirectory = config.workingDirectory;
    const nodeVersion = config.nodeVersion || '20';

    // Determine release command
    let releaseCommand: string;
    if (config.customReleaseCommand) {
      releaseCommand = config.customReleaseCommand;
    } else if (config.semanticRelease) {
      releaseCommand = 'npx semantic-release';
    } else {
      releaseCommand = 'npx release-it';
    }

    // Create release workflow
    const workflow = new WorkflowConstruct(stack, 'release', {
      name: 'Release',
      on: {
        push: {
          branches: branches
        }
      },
      permissions: {
        contents: 'write',
        'id-token': 'write',
        packages: 'write'
      }
    });

    // Create release job
    const releaseJob = new JobConstruct(workflow, 'release', {
      runsOn: ['ubuntu-latest'],
      steps: [
        createStep('actions/checkout@v4', {
          name: 'Checkout code',
          with: {
            'fetch-depth': 0,
            token: '${{ secrets.GITHUB_TOKEN }}'
          }
        }),
        
        createStep('actions/setup-node@v4', {
          name: 'Setup Node.js',
          with: {
            'node-version': nodeVersion,
            registry: registry,
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

        ...(buildCommand ? [{
          name: 'Build',
          run: buildCommand,
          ...(workingDirectory && { 'working-directory': workingDirectory })
        }] : []),

        {
          name: 'Release',
          run: releaseCommand,
          env: {
            GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
            NPM_TOKEN: '${{ secrets.NPM_TOKEN }}'
          },
          ...(workingDirectory && { 'working-directory': workingDirectory })
        }
      ]
    });

    workflow.addJob('release', releaseJob);
    
    // Store metadata
    stack.setMetadata('release', {
      enabled: true,
      branches,
      packageManager,
      registry,
      releaseCommand
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
export const releasePlugin = new ReleasePlugin();