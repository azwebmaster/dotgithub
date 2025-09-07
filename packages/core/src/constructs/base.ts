import type { GitHubWorkflow, GitHubWorkflows } from '../types/workflow';
import type { DotGitHubResource, DotGitHubResources, DotGitHub } from '../types/common';
import * as yaml from 'js-yaml';

export interface IConstruct {
  readonly node: ConstructNode;
}

export class ConstructNode {
  constructor(
    public readonly host: IConstruct,
    public readonly scope: IConstruct | undefined,
    public readonly id: string
  ) {}

  get path(): string {
    if (!this.scope) {
      return this.id;
    }
    return `${this.scope.node.path}/${this.id}`;
  }
}

export abstract class Construct implements IConstruct {
  public readonly node: ConstructNode;

  constructor(scope: IConstruct | undefined, id: string) {
    this.node = new ConstructNode(this, scope, id);
  }
}

export class GitHubStack extends Construct {
  private readonly _workflows: GitHubWorkflows = {};
  private readonly _resources: DotGitHubResources = {};

  constructor(scope?: IConstruct, id: string = 'GitHubStack') {
    super(scope, id);
  }

  addWorkflow(id: string, workflow: GitHubWorkflow): void {
    this._workflows[id] = workflow;
  }

  addResource(path: string, resource: DotGitHubResource): void {
    this._resources[path] = resource;
  }

  addFileResource(path: string, content: string): void {
    this._resources[path] = { content };
  }

  addDirectoryResource(path: string, children: DotGitHubResources = {}): void {
    this._resources[path] = { children };
  }

  get workflows(): GitHubWorkflows {
    return { ...this._workflows };
  }

  get resources(): DotGitHubResources {
    return { ...this._resources };
  }

  getDotGitHub(): DotGitHub {
    return {
      workflows: this.workflows,
      ...this.resources
    };
  }

  synth(): Record<string, string> {
    const files: Record<string, string> = {};
    
    // Generate workflow files
    for (const [workflowId, workflow] of Object.entries(this._workflows)) {
      const filename = `workflows/${workflowId}.yml`;
      files[filename] = yaml.dump(workflow, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    }
    
    // Generate other resource files
    this._synthResourcesRecursive('', this._resources, files);
    
    return files;
  }

  private _synthResourcesRecursive(basePath: string, resources: DotGitHubResources, files: Record<string, string>): void {
    for (const [name, resource] of Object.entries(resources)) {
      const fullPath = basePath ? `${basePath}/${name}` : name;
      
      if (resource.content !== undefined) {
        // It's a file
        if (typeof resource.content === 'string') {
          files[fullPath] = resource.content;
        } else {
          // Serialize non-string content (JSON, YAML, etc.)
          files[fullPath] = yaml.dump(resource.content, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false
          });
        }
      } else if (resource.children) {
        // It's a directory - recurse into children
        this._synthResourcesRecursive(fullPath, resource.children, files);
      }
    }
  }

  synthToDirectory(outputDir: string): void {
    const files = this.synth();
    
    for (const [filename, content] of Object.entries(files)) {
      const filePath = `${outputDir}/.github/${filename}`;
      // In a real implementation, you'd write to filesystem here
      console.log(`Would write ${filePath}:\n${content}`);
    }
  }
}