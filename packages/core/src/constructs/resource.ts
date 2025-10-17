import { Construct, GitHubStack } from './base.js';
import type { DotGitHubResource, DotGitHubResources } from '../types/common.js';

export interface ResourceProps {
  content?: unknown;
  children?: DotGitHubResources;
}

export class ResourceConstruct extends Construct {
  private readonly _resource: DotGitHubResource;
  private readonly _path: string;

  constructor(scope: GitHubStack, path: string, props: ResourceProps) {
    super(scope, path.replace(/[\/\\]/g, '-'));
    
    this._path = path;
    this._resource = {
      content: props.content,
      children: props.children
    };

    scope.addResource(path, this._resource);
  }

  get resource(): DotGitHubResource {
    return { ...this._resource };
  }

  get path(): string {
    return this._path;
  }

  updateContent(content: unknown): void {
    this._resource.content = content;
  }

  addChild(name: string, child: DotGitHubResource): void {
    if (!this._resource.children) {
      this._resource.children = {};
    }
    this._resource.children[name] = child;
  }
}

export class FileResourceConstruct extends ResourceConstruct {
  constructor(scope: GitHubStack, path: string, content: string) {
    super(scope, path, { content });
  }

  override updateContent(content: string): void {
    super.updateContent(content);
  }
}

export class DirectoryResourceConstruct extends ResourceConstruct {
  constructor(scope: GitHubStack, path: string, children: DotGitHubResources = {}) {
    super(scope, path, { children });
  }

  addFile(name: string, content: string): void {
    this.addChild(name, { content });
  }

  addDirectory(name: string, children: DotGitHubResources = {}): void {
    this.addChild(name, { children });
  }
}

// Convenience constructors for common GitHub files
export class IssueTemplateConstruct extends FileResourceConstruct {
  constructor(scope: GitHubStack, name: string, template: {
    name: string;
    about: string;
    title?: string;
    labels?: string[];
    assignees?: string[];
    body?: Array<{
      type: 'markdown' | 'textarea' | 'input' | 'dropdown' | 'checkboxes';
      id?: string;
      attributes: Record<string, any>;
      validations?: Record<string, any>;
    }>;
  }) {
    const content = [
      '---',
      `name: ${template.name}`,
      `about: ${template.about}`,
      template.title && `title: "${template.title}"`,
      template.labels && `labels: ${template.labels.join(', ')}`,
      template.assignees && `assignees: ${template.assignees.join(', ')}`,
      '---',
      '',
      ...(template.body?.map(item => {
        const lines = [`type: ${item.type}`];
        if (item.id) lines.push(`id: ${item.id}`);
        lines.push('attributes:');
        Object.entries(item.attributes).forEach(([key, value]) => {
          lines.push(`  ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
        });
        if (item.validations) {
          lines.push('validations:');
          Object.entries(item.validations).forEach(([key, value]) => {
            lines.push(`  ${key}: ${value}`);
          });
        }
        return lines.join('\n');
      }) || [])
    ].filter(Boolean).join('\n');

    super(scope, `ISSUE_TEMPLATE/${name}.yml`, content);
  }
}

export class PullRequestTemplateConstruct extends FileResourceConstruct {
  constructor(scope: GitHubStack, content: string) {
    super(scope, 'PULL_REQUEST_TEMPLATE.md', content);
  }
}

export class CodeownersConstruct extends FileResourceConstruct {
  constructor(scope: GitHubStack, owners: Record<string, string[]>) {
    const content = Object.entries(owners)
      .map(([pattern, reviewers]) => `${pattern} ${reviewers.join(' ')}`)
      .join('\n');
    
    super(scope, 'CODEOWNERS', content);
  }
}

export class DependabotConstruct extends FileResourceConstruct {
  constructor(scope: GitHubStack, config: {
    version: number;
    updates: Array<{
      'package-ecosystem': string;
      directory: string;
      schedule: { interval: string };
      [key: string]: any;
    }>;
  }) {
    const yamlContent = `version: ${config.version}\nupdates:\n${config.updates
      .map(update => 
        `  - package-ecosystem: "${update['package-ecosystem']}"\n` +
        `    directory: "${update.directory}"\n` +
        `    schedule:\n` +
        `      interval: "${update.schedule.interval}"\n` +
        Object.entries(update)
          .filter(([key]) => !['package-ecosystem', 'directory', 'schedule'].includes(key))
          .map(([key, value]) => `    ${key}: ${JSON.stringify(value)}`)
          .join('\n')
      )
      .join('\n')}`;
    
    super(scope, 'dependabot.yml', yamlContent);
  }
}