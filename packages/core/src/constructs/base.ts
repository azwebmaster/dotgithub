import type { GitHubWorkflow, GitHubWorkflows } from '../types/workflow';
import type { DotGitHubResource, DotGitHubResources, DotGitHub } from '../types/common';
import * as yaml from 'yaml';

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
  private readonly _metadata: Record<string, any> = {};

  constructor(scope?: IConstruct, id: string = 'GitHubStack') {
    super(scope, id);
  }

  addWorkflow(id: string, workflow: GitHubWorkflow): GitHubWorkflow {
    this._workflows[id] = workflow;
    return workflow;
  }

  addResource(path: string, resource: DotGitHubResource): DotGitHubResource {
    this._resources[path] = resource;
    return resource;
  }

  addFileResource(path: string, content: string): DotGitHubResource {
    this._resources[path] = { content };
    return this._resources[path];
  }

  addDirectoryResource(path: string, children: DotGitHubResources = {}): DotGitHubResource {
    this._resources[path] = { children };
    return this._resources[path];
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
      const processedWorkflow = this._processWorkflowForYaml(workflow);
      files[filename] = yaml.stringify(processedWorkflow, {
        indent: 2,
        lineWidth: 0,
        minContentWidth: 0,
        simpleKeys: false,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40
      });
    }
    
    // Generate other resource files
    this._synthResourcesRecursive('', this._resources, files);
    
    return files;
  }

  private _processWorkflowForYaml(workflow: GitHubWorkflow): any {
    const processed: any = { ...workflow };
    
    if (processed.jobs) {
      for (const [jobId, job] of Object.entries(processed.jobs)) {
        if (job && typeof job === 'object' && 'steps' in job && Array.isArray(job.steps)) {
          processed.jobs[jobId] = {
            ...job,
            steps: job.steps.map((step: any) => this._processStepForYaml(step))
          };
        }
      }
    }
    
    return processed;
  }

  private _processStepForYaml(step: any): any {
    const processed = { ...step };
    
    // Remove empty 'with' fields
    if (processed.with && typeof processed.with === 'object' && Object.keys(processed.with).length === 0) {
      delete processed.with;
    }
    
    return processed;
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
          files[fullPath] = yaml.stringify(resource.content, {
            indent: 2,
            lineWidth: 0,
            minContentWidth: 0,
            simpleKeys: false,
            doubleQuotedAsJSON: false,
            doubleQuotedMinMultiLineLength: 40
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

  setMetadata(key: string, value: any): void {
    this._metadata[key] = value;
  }

  getMetadata(key: string): any {
    return this._metadata[key];
  }

  getAllMetadata(): Record<string, any> {
    return { ...this._metadata };
  }

  hasMetadata(key: string): boolean {
    return key in this._metadata;
  }

  removeMetadata(key: string): boolean {
    if (key in this._metadata) {
      delete this._metadata[key];
      return true;
    }
    return false;
  }
}