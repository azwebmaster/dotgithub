import type { GitHubWorkflow, GitHubWorkflows } from '../types/workflow.js';
import type {
  DotGitHubResource,
  DotGitHubResources,
  DotGitHub,
} from '../types/common.js';
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

  private findStack(): GitHubStack | undefined {
    let current: IConstruct | undefined = this;
    while (current) {
      if (current instanceof GitHubStack) {
        return current;
      }
      current = current.node.scope;
    }
    return undefined;
  }

  /**
   * Gets the GitHubStack from the scope
   */
  get stack(): GitHubStack {
    const stack = this.findStack();
    if (!stack) {
      throw new Error('ActionsConstruct must be created within a GitHubStack');
    }

    return stack;
  }
}

export class GitHubStack extends Construct {
  private readonly _workflows: GitHubWorkflows = {};
  private readonly _resources: DotGitHubResources = {};
  private readonly _metadata: Record<string, any> = {};

  // Plugin context properties
  public config?: Record<string, any>;
  public stackConfig?: any;
  public projectRoot?: string;
  public actions?: any;
  public sharedWorkflows?: any;

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

  addDirectoryResource(
    path: string,
    children: DotGitHubResources = {}
  ): DotGitHubResource {
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
      ...this.resources,
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
        doubleQuotedMinMultiLineLength: 40,
      });
    }

    // Generate other resource files
    this._synthResourcesRecursive('', this._resources, files);

    return files;
  }

  private _processWorkflowForYaml(workflow: GitHubWorkflow): any {
    // Create ordered workflow object to control YAML property order
    const processed: any = {};

    // Define the desired order for workflow properties
    const workflowOrder = [
      'name',
      'run-name',
      'on',
      'permissions',
      'env',
      'defaults',
      'concurrency',
      'jobs',
    ];

    // Add properties in the specified order
    for (const key of workflowOrder) {
      if (workflow[key as keyof GitHubWorkflow] !== undefined) {
        processed[key] = workflow[key as keyof GitHubWorkflow];
      }
    }

    // Process jobs with ordered properties
    if (processed.jobs) {
      for (const [jobId, job] of Object.entries(processed.jobs)) {
        if (
          job &&
          typeof job === 'object' &&
          'steps' in job &&
          Array.isArray(job.steps)
        ) {
          processed.jobs[jobId] = this._processJobForYaml(job);
        }
      }
    }

    return processed;
  }

  private _processJobForYaml(job: any): any {
    // Define the desired order for job properties
    const jobOrder = [
      'name',
      'permissions',
      'needs',
      'if',
      'runs-on',
      'environment',
      'concurrency',
      'outputs',
      'env',
      'defaults',
      'steps',
      'strategy',
      'container',
      'services',
      'uses',
      'with',
      'secrets',
      'timeout-minutes',
      'continue-on-error',
    ];

    const processed: any = {};

    // Add properties in the specified order
    for (const key of jobOrder) {
      if (job[key] !== undefined) {
        if (key === 'steps' && Array.isArray(job[key])) {
          processed[key] = job[key].map((step: any) =>
            this._processStepForYaml(step)
          );
        } else {
          processed[key] = job[key];
        }
      }
    }

    return processed;
  }

  private _processStepForYaml(step: any): any {
    // Define the desired order for step properties
    const stepOrder = [
      'id',
      'if',
      'name',
      'uses',
      'run',
      'shell',
      'with',
      'env',
      'continue-on-error',
      'timeout-minutes',
      'working-directory',
    ];

    const processed: any = {};

    // Add properties in the specified order
    for (const key of stepOrder) {
      if (step[key] !== undefined) {
        // Remove empty 'with' fields
        if (
          key === 'with' &&
          typeof step[key] === 'object' &&
          Object.keys(step[key]).length === 0
        ) {
          continue; // Skip empty with fields
        }
        processed[key] = step[key];
      }
    }

    return processed;
  }

  private _synthResourcesRecursive(
    basePath: string,
    resources: DotGitHubResources,
    files: Record<string, string>
  ): void {
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
            doubleQuotedMinMultiLineLength: 40,
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
