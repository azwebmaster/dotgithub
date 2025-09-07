import * as fs from 'fs';
import * as path from 'path';
import type { TemplateConfig, TemplateVariable } from './template';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  field?: string;
}

export interface ValidationOptions {
  checkFiles?: boolean;
  checkSyntax?: boolean;
  allowMissingFiles?: boolean;
  strictVariableValidation?: boolean;
}

export class TemplateValidator {
  constructor(private options: ValidationOptions = {}) {
    this.options = {
      checkFiles: true,
      checkSyntax: true,
      allowMissingFiles: false,
      strictVariableValidation: true,
      ...options
    };
  }

  async validateTemplate(templatePath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if template directory exists
      if (!fs.existsSync(templatePath) || !fs.statSync(templatePath).isDirectory()) {
        result.errors.push({
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template directory not found: ${templatePath}`,
          path: templatePath
        });
        result.valid = false;
        return result;
      }

      // Validate template.json
      await this.validateTemplateConfig(templatePath, result);

      if (this.options.checkFiles) {
        // Validate template file structure
        await this.validateTemplateStructure(templatePath, result);
      }

      if (this.options.checkSyntax) {
        // Validate workflow files syntax
        await this.validateWorkflowFiles(templatePath, result);
        
        // Validate GitHub files syntax
        await this.validateGithubFiles(templatePath, result);
      }

    } catch (error) {
      result.errors.push({
        code: 'VALIDATION_ERROR',
        message: `Unexpected error during validation: ${error instanceof Error ? error.message : String(error)}`,
        path: templatePath
      });
      result.valid = false;
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  private async validateTemplateConfig(templatePath: string, result: ValidationResult): Promise<void> {
    const configPath = path.join(templatePath, 'template.json');

    if (!fs.existsSync(configPath)) {
      result.errors.push({
        code: 'MISSING_TEMPLATE_CONFIG',
        message: 'template.json file is required',
        path: configPath
      });
      return;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config: TemplateConfig = JSON.parse(configContent);

      // Validate required fields
      if (!config.name || typeof config.name !== 'string') {
        result.errors.push({
          code: 'MISSING_TEMPLATE_NAME',
          message: 'Template name is required and must be a string',
          field: 'name'
        });
      }

      // Validate optional fields
      if (config.description && typeof config.description !== 'string') {
        result.warnings.push({
          code: 'INVALID_DESCRIPTION',
          message: 'Template description should be a string',
          field: 'description'
        });
      }

      if (config.category && typeof config.category !== 'string') {
        result.warnings.push({
          code: 'INVALID_CATEGORY',
          message: 'Template category should be a string',
          field: 'category'
        });
      }

      // Validate variables
      if (config.variables) {
        this.validateTemplateVariables(config.variables, result);
      }

      // Validate files configuration
      if (config.files) {
        this.validateFilesConfig(config.files, result);
      }

      // Validate dependencies and conflicts
      if (config.dependencies) {
        this.validateDependenciesArray(config.dependencies, 'dependencies', result);
      }

      if (config.conflicts) {
        this.validateDependenciesArray(config.conflicts, 'conflicts', result);
      }

    } catch (error) {
      result.errors.push({
        code: 'INVALID_TEMPLATE_CONFIG',
        message: `Failed to parse template.json: ${error instanceof Error ? error.message : String(error)}`,
        path: configPath
      });
    }
  }

  private validateTemplateVariables(variables: { [key: string]: TemplateVariable }, result: ValidationResult): void {
    for (const [varName, varConfig] of Object.entries(variables)) {
      if (!varName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        result.errors.push({
          code: 'INVALID_VARIABLE_NAME',
          message: `Variable name "${varName}" is not valid. Use alphanumeric characters and underscores only.`,
          field: `variables.${varName}`
        });
      }

      if (!varConfig.type || !['string', 'number', 'boolean', 'choice'].includes(varConfig.type)) {
        result.errors.push({
          code: 'INVALID_VARIABLE_TYPE',
          message: `Variable "${varName}" has invalid type. Must be one of: string, number, boolean, choice`,
          field: `variables.${varName}.type`
        });
      }

      if (varConfig.type === 'choice' && (!varConfig.options || !Array.isArray(varConfig.options) || varConfig.options.length === 0)) {
        result.errors.push({
          code: 'CHOICE_MISSING_OPTIONS',
          message: `Variable "${varName}" of type "choice" must have a non-empty options array`,
          field: `variables.${varName}.options`
        });
      }

      if (varConfig.default !== undefined && varConfig.type === 'choice' && varConfig.options && !varConfig.options.includes(String(varConfig.default))) {
        result.errors.push({
          code: 'INVALID_CHOICE_DEFAULT',
          message: `Variable "${varName}" default value "${varConfig.default}" is not in options`,
          field: `variables.${varName}.default`
        });
      }

      if (this.options.strictVariableValidation) {
        if (!varConfig.description) {
          result.warnings.push({
            code: 'MISSING_VARIABLE_DESCRIPTION',
            message: `Variable "${varName}" should have a description`,
            field: `variables.${varName}.description`
          });
        }
      }
    }
  }

  private validateFilesConfig(files: { workflows?: string[]; github?: string[] }, result: ValidationResult): void {
    if (files.workflows && !Array.isArray(files.workflows)) {
      result.errors.push({
        code: 'INVALID_FILES_CONFIG',
        message: 'files.workflows must be an array',
        field: 'files.workflows'
      });
    }

    if (files.github && !Array.isArray(files.github)) {
      result.errors.push({
        code: 'INVALID_FILES_CONFIG',
        message: 'files.github must be an array',
        field: 'files.github'
      });
    }
  }

  private validateDependenciesArray(deps: string[], fieldName: string, result: ValidationResult): void {
    if (!Array.isArray(deps)) {
      result.errors.push({
        code: 'INVALID_DEPENDENCIES',
        message: `${fieldName} must be an array`,
        field: fieldName
      });
      return;
    }

    for (const dep of deps) {
      if (typeof dep !== 'string') {
        result.errors.push({
          code: 'INVALID_DEPENDENCY',
          message: `All ${fieldName} must be strings`,
          field: fieldName
        });
      }
    }
  }

  private async validateTemplateStructure(templatePath: string, result: ValidationResult): Promise<void> {
    const workflowsPath = path.join(templatePath, 'workflows');
    const githubPath = path.join(templatePath, 'github-files');

    const hasWorkflows = fs.existsSync(workflowsPath);
    const hasGithubFiles = fs.existsSync(githubPath);

    if (!hasWorkflows && !hasGithubFiles && !this.options.allowMissingFiles) {
      result.warnings.push({
        code: 'EMPTY_TEMPLATE',
        message: 'Template has no workflows or github-files directories',
        path: templatePath
      });
    }

    if (hasWorkflows) {
      const workflowFiles = fs.readdirSync(workflowsPath);
      if (workflowFiles.length === 0) {
        result.warnings.push({
          code: 'EMPTY_WORKFLOWS_DIR',
          message: 'workflows directory exists but is empty',
          path: workflowsPath
        });
      }

      // Check for non-TypeScript files in workflows
      const nonTsFiles = workflowFiles.filter(f => !f.endsWith('.ts'));
      if (nonTsFiles.length > 0) {
        result.warnings.push({
          code: 'NON_TS_WORKFLOW_FILES',
          message: `Workflow directory contains non-TypeScript files: ${nonTsFiles.join(', ')}`,
          path: workflowsPath
        });
      }
    }

    if (hasGithubFiles) {
      const githubFiles = fs.readdirSync(githubPath);
      if (githubFiles.length === 0) {
        result.warnings.push({
          code: 'EMPTY_GITHUB_FILES_DIR',
          message: 'github-files directory exists but is empty',
          path: githubPath
        });
      }
    }
  }

  private async validateWorkflowFiles(templatePath: string, result: ValidationResult): Promise<void> {
    const workflowsPath = path.join(templatePath, 'workflows');
    
    if (!fs.existsSync(workflowsPath)) {
      return;
    }

    const workflowFiles = fs.readdirSync(workflowsPath).filter(f => f.endsWith('.ts'));

    for (const file of workflowFiles) {
      const filePath = path.join(workflowsPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic syntax checks
        if (content.trim().length === 0) {
          result.warnings.push({
            code: 'EMPTY_WORKFLOW_FILE',
            message: `Workflow file is empty: ${file}`,
            path: filePath
          });
        }

        // Check for common workflow structure
        if (!content.includes('name:') && !content.includes('"on":') && !content.includes('jobs:')) {
          result.warnings.push({
            code: 'INVALID_WORKFLOW_STRUCTURE',
            message: `Workflow file may not have valid structure: ${file}`,
            path: filePath
          });
        }

        // Check for variable placeholders
        const variablePlaceholders = content.match(/\{\{\s*\w+\s*\}\}/g) || [];
        if (variablePlaceholders.length === 0) {
          result.warnings.push({
            code: 'NO_TEMPLATE_VARIABLES',
            message: `Workflow file contains no template variables: ${file}`,
            path: filePath
          });
        }

      } catch (error) {
        result.errors.push({
          code: 'WORKFLOW_FILE_READ_ERROR',
          message: `Failed to read workflow file ${file}: ${error instanceof Error ? error.message : String(error)}`,
          path: filePath
        });
      }
    }
  }

  private async validateGithubFiles(templatePath: string, result: ValidationResult): Promise<void> {
    const githubPath = path.join(templatePath, 'github-files');
    
    if (!fs.existsSync(githubPath)) {
      return;
    }

    const this_validateFile = (filePath: string, relativePath: string) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.trim().length === 0) {
          result.warnings.push({
            code: 'EMPTY_GITHUB_FILE',
            message: `GitHub file is empty: ${relativePath}`,
            path: filePath
          });
        }

        // Validate specific GitHub file formats
        if (relativePath === 'dependabot.yml') {
          this.validateDependabotFile(content, filePath, result);
        } else if (relativePath === 'CODEOWNERS') {
          this.validateCodeownersFile(content, filePath, result);
        }

      } catch (error) {
        result.errors.push({
          code: 'GITHUB_FILE_READ_ERROR',
          message: `Failed to read GitHub file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
          path: filePath
        });
      }
    };

    this.walkDirectory(githubPath, githubPath, this_validateFile);
  }

  private walkDirectory(basePath: string, currentPath: string, fileCallback: (filePath: string, relativePath: string) => void): void {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const relativePath = path.relative(basePath, itemPath);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.walkDirectory(basePath, itemPath, fileCallback);
      } else {
        fileCallback(itemPath, relativePath);
      }
    }
  }

  private validateDependabotFile(content: string, filePath: string, result: ValidationResult): void {
    try {
      // Basic YAML structure validation
      if (!content.includes('version:') || !content.includes('updates:')) {
        result.warnings.push({
          code: 'INVALID_DEPENDABOT_STRUCTURE',
          message: 'dependabot.yml should contain version and updates fields',
          path: filePath
        });
      }
    } catch (error) {
      result.warnings.push({
        code: 'DEPENDABOT_VALIDATION_ERROR',
        message: `Error validating dependabot.yml: ${error instanceof Error ? error.message : String(error)}`,
        path: filePath
      });
    }
  }

  private validateCodeownersFile(content: string, filePath: string, result: ValidationResult): void {
    const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    
    if (lines.length === 0) {
      result.warnings.push({
        code: 'EMPTY_CODEOWNERS',
        message: 'CODEOWNERS file has no ownership rules',
        path: filePath
      });
      return;
    }

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) {
        result.warnings.push({
          code: 'INVALID_CODEOWNERS_LINE',
          message: `Invalid CODEOWNERS line format: ${line.trim()}`,
          path: filePath
        });
      }
    }
  }
}

export function validateTemplate(templatePath: string, options?: ValidationOptions): Promise<ValidationResult> {
  const validator = new TemplateValidator(options);
  return validator.validateTemplate(templatePath);
}

export function createTemplateValidator(options?: ValidationOptions): TemplateValidator {
  return new TemplateValidator(options);
}