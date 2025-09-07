import * as fs from 'fs';
import * as path from 'path';

export interface TemplateVariable {
  type: 'string' | 'number' | 'boolean' | 'choice';
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  options?: string[];
}

export interface TemplateConfig {
  name: string;
  description?: string;
  category?: string;
  version?: string;
  variables?: { [key: string]: TemplateVariable };
  files?: {
    workflows?: string[];
    github?: string[];
  };
  dependencies?: string[];
  conflicts?: string[];
}

export interface TemplateContext {
  variables: { [key: string]: any };
  templatePath: string;
}

export interface ProcessedTemplate {
  config: TemplateConfig;
  workflows: { [filename: string]: string };
  githubFiles: { [filename: string]: string };
}

export class TemplateLoader {
  constructor(private templatePaths: string[] = []) {}

  async loadTemplate(templateName: string): Promise<TemplateConfig> {
    const templatePath = await this.findTemplatePath(templateName);
    const configPath = path.join(templatePath, 'template.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Template configuration not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config: TemplateConfig = JSON.parse(configContent);
    
    return config;
  }

  async processTemplate(templateName: string, variables: { [key: string]: any } = {}): Promise<ProcessedTemplate> {
    const templatePath = await this.findTemplatePath(templateName);
    const config = await this.loadTemplate(templateName);
    
    const resolvedVariables = this.resolveVariables(config.variables || {}, variables);
    const context: TemplateContext = {
      variables: resolvedVariables,
      templatePath
    };

    const workflows = await this.processWorkflows(context, config);
    const githubFiles = await this.processGithubFiles(context, config);

    return {
      config,
      workflows,
      githubFiles
    };
  }

  private async findTemplatePath(templateName: string): Promise<string> {
    // Check if it's a direct path
    if (fs.existsSync(templateName) && fs.statSync(templateName).isDirectory()) {
      return templateName;
    }

    // Check in template paths
    for (const basePath of this.templatePaths) {
      const templatePath = path.join(basePath, templateName);
      if (fs.existsSync(templatePath) && fs.statSync(templatePath).isDirectory()) {
        return templatePath;
      }
    }

    // Check in node_modules for NPM packages
    const nodeModulesPath = this.findNodeModulesTemplate(templateName);
    if (nodeModulesPath) {
      return nodeModulesPath;
    }

    throw new Error(`Template not found: ${templateName}`);
  }

  private findNodeModulesTemplate(templateName: string): string | null {
    // Check if it's a scoped package
    const packageName = templateName.startsWith('@') ? templateName : `@dotgithub/template-${templateName}`;
    
    let currentDir = process.cwd();
    while (currentDir !== path.dirname(currentDir)) {
      const nodeModulesPath = path.join(currentDir, 'node_modules', packageName);
      if (fs.existsSync(nodeModulesPath)) {
        return nodeModulesPath;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  private resolveVariables(templateVars: { [key: string]: TemplateVariable }, providedVars: { [key: string]: any }): { [key: string]: any } {
    const resolved: { [key: string]: any } = {};

    for (const [key, config] of Object.entries(templateVars)) {
      let value = providedVars[key];

      // Use provided value, fallback to default, or require if needed
      if (value === undefined || value === null) {
        if (config.default !== undefined) {
          value = config.default;
        } else if (config.required) {
          throw new Error(`Required variable "${key}" not provided`);
        }
      }

      // Type validation and conversion
      if (value !== undefined) {
        value = this.validateAndConvertVariable(key, value, config);
      }

      resolved[key] = value;
    }

    return resolved;
  }

  private validateAndConvertVariable(key: string, value: any, config: TemplateVariable): any {
    switch (config.type) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Variable "${key}" must be a number, got: ${value}`);
        }
        return num;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true' || value === '1') return true;
        if (value === 'false' || value === '0') return false;
        throw new Error(`Variable "${key}" must be a boolean, got: ${value}`);
      case 'choice':
        if (!config.options?.includes(String(value))) {
          throw new Error(`Variable "${key}" must be one of: ${config.options?.join(', ')}, got: ${value}`);
        }
        return String(value);
      default:
        return value;
    }
  }

  private async processWorkflows(context: TemplateContext, config: TemplateConfig): Promise<{ [filename: string]: string }> {
    const workflows: { [filename: string]: string } = {};
    const workflowsPath = path.join(context.templatePath, 'workflows');

    if (!fs.existsSync(workflowsPath)) {
      return workflows;
    }

    const workflowFiles = config.files?.workflows || fs.readdirSync(workflowsPath).filter(f => f.endsWith('.ts'));
    
    for (const filename of workflowFiles) {
      const filePath = path.join(workflowsPath, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const processed = this.substituteVariables(content, context.variables);
        workflows[filename] = processed;
      }
    }

    return workflows;
  }

  private async processGithubFiles(context: TemplateContext, config: TemplateConfig): Promise<{ [filename: string]: string }> {
    const githubFiles: { [filename: string]: string } = {};
    const githubPath = path.join(context.templatePath, 'github-files');

    if (!fs.existsSync(githubPath)) {
      return githubFiles;
    }

    const allFiles = this.getAllFiles(githubPath);
    const targetFiles = config.files?.github || allFiles.map(f => path.relative(githubPath, f));

    for (const relativePath of targetFiles) {
      const filePath = path.join(githubPath, relativePath);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const processed = this.substituteVariables(content, context.variables);
        githubFiles[relativePath] = processed;
      }
    }

    return githubFiles;
  }

  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(itemPath));
      } else {
        files.push(itemPath);
      }
    }

    return files;
  }

  private substituteVariables(content: string, variables: { [key: string]: any }): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      // Replace {{variable}} syntax
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }
}

export function createTemplateLoader(templatePaths?: string[]): TemplateLoader {
  return new TemplateLoader(templatePaths);
}