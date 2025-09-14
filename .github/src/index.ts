// GitHub Actions workspace entry point
import { createStep, DotGitHub, JobConstruct, WorkflowConstruct } from '@dotgithub/core';

import { DotGitHubPlugin } from '@dotgithub/core';
import type { GitHubStack, PluginContext } from '@dotgithub/core';
import { checkout } from './actions/actions';

export interface SecurityPluginConfig {
  enableCodeQL?: boolean;
  enableDependabot?: boolean;
  scanSchedule?: string;
}

export class SecurityPlugin extends DotGitHubPlugin {
  override readonly name = 'security';
  override readonly version = '1.0.0';
  override readonly description = 'Security scanning workflows';

  override validate(context: PluginContext): void {
    const config = context.config as SecurityPluginConfig;
    
    if (config.scanSchedule && !config.scanSchedule.match(/^[0-9\s\*\/\-\,]+$/)) {
      throw new Error('Invalid cron schedule format');
    }
  }

  override apply(context: PluginContext): void {
    const config = context.config as SecurityPluginConfig;
    const { stack } = context;

    if (config.enableCodeQL !== false) {
      this.addCodeQLWorkflow(stack, config);
    }

    if (config.enableDependabot !== false) {
      this.addDependabotConfig(stack, config);
    }
  }

  private addCodeQLWorkflow(stack: GitHubStack, config: SecurityPluginConfig) {
    const workflow = new WorkflowConstruct(stack, 'security', {
      name: 'Security Scan',
      on: {
        schedule: [{ cron: config.scanSchedule || '0 6 * * 1' }],
        push: { branches: ['main'] },
        pull_request: { branches: ['main'] }
      },
      permissions: {
        actions: 'read',
        contents: 'read',
        'security-events': 'write'
      }
    });

    new JobConstruct(workflow, 'analyze', {
      'runs-on': ['ubuntu-latest'],
      strategy: {
        matrix: {
          language: ['javascript', 'typescript']
        }
      },
      steps: [
        checkout(),
        createStep('github/codeql-action/init', {
          with: {
            languages: '${{ matrix.language }}'
          }
        }, 'v3'),
        createStep('github/codeql-action/analyze', {}, 'v3')
      ]
    });
    
    stack.setMetadata('security', {
      codeQLEnabled: true,
      scanSchedule: config.scanSchedule || '0 6 * * 1'
    });
  }

  private addDependabotConfig(stack: GitHubStack, config: SecurityPluginConfig) {
    const dependabotConfig = {
      version: 2,
      updates: [
        {
          'package-ecosystem': 'npm',
          directory: '/',
          schedule: {
            interval: 'weekly',
            day: 'monday'
          },
          'open-pull-requests-limit': 10
        }
      ]
    };

    stack.addFileResource('dependabot.yml', JSON.stringify(dependabotConfig, null, 2));
  }
}

// Export for use
export const securityPlugin = new SecurityPlugin();
export default securityPlugin;