import { Project, SourceFile, InterfaceDeclaration, FunctionDeclaration, VariableDeclaration } from 'ts-morph';

/**
 * Example demonstrating how to use ts-morph for TypeScript code generation
 * This shows how to programmatically create TypeScript interfaces, functions, and classes
 */
export class TypeScriptGenerator {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 5, // ES2022
        module: 1, // CommonJS
        declaration: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
    });
  }

  /**
   * Generate a TypeScript interface for GitHub Action inputs
   */
  generateActionInputsInterface(actionName: string, inputs: Record<string, any>): string {
    const fileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`;
    const sourceFile = this.project.createSourceFile(fileName);
    
    const interfaceName = `${this.toPascalCase(actionName)}Inputs`;
    
    const interfaceDeclaration = sourceFile.addInterface({
      name: interfaceName,
      isExported: true,
      properties: Object.entries(inputs).map(([key, value]) => ({
        name: key,
        type: this.getTypeScriptType(value),
        hasQuestionToken: true, // Make all properties optional
        docs: [`Input parameter: ${key}`],
      })),
    });

    // Add JSDoc comment
    interfaceDeclaration.addJsDoc({
      description: `Input parameters for the ${actionName} action`,
    });

    return sourceFile.getFullText();
  }

  /**
   * Generate a factory function for creating GitHub Action steps
   */
  generateActionFactoryFunction(actionName: string, inputs: Record<string, any>): string {
    const fileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`;
    const sourceFile = this.project.createSourceFile(fileName);
    
    const functionName = this.toCamelCase(actionName);
    const interfaceName = `${this.toPascalCase(actionName)}Inputs`;
    
    const functionDeclaration = sourceFile.addFunction({
      name: functionName,
      isExported: true,
      parameters: [{
        name: 'inputs',
        type: `${interfaceName} | undefined`,
        hasQuestionToken: true,
      }],
      returnType: `GitHubStep<${interfaceName}>`,
      statements: [
        `return createStep("${actionName}", { with: inputs }, "latest");`,
      ],
    });

    // Add JSDoc comment
    functionDeclaration.addJsDoc({
      description: `Creates a step for the ${actionName} action
@param inputs Optional input parameters for the action
@returns A GitHub step configuration`,
    });

    return sourceFile.getFullText();
  }

  /**
   * Generate a complete action module with interface and factory function
   */
  generateActionModule(actionName: string, inputs: Record<string, any>): string {
    const fileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`;
    const sourceFile = this.project.createSourceFile(fileName);
    
    // Add imports
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: ['GitHubStep', 'createStep'],
    });

    // Generate interface
    const interfaceName = `${this.toPascalCase(actionName)}Inputs`;
    const interfaceDeclaration = sourceFile.addInterface({
      name: interfaceName,
      isExported: true,
      properties: Object.entries(inputs).map(([key, value]) => ({
        name: key,
        type: this.getTypeScriptType(value),
        hasQuestionToken: true,
        docs: [`Input parameter: ${key}`],
      })),
    });

    interfaceDeclaration.addJsDoc({
      description: `Input parameters for the ${actionName} action`,
    });

    // Generate factory function
    const functionName = this.toCamelCase(actionName);
    const functionDeclaration = sourceFile.addFunction({
      name: functionName,
      isExported: true,
      parameters: [{
        name: 'inputs',
        type: `${interfaceName} | undefined`,
        hasQuestionToken: true,
      }],
      returnType: `GitHubStep<${interfaceName}>`,
      statements: [
        `return createStep("${actionName}", { with: inputs }, "latest");`,
      ],
    });

    functionDeclaration.addJsDoc({
      description: `Creates a step for the ${actionName} action
@param inputs Optional input parameters for the action
@returns A GitHub step configuration`,
    });

    return sourceFile.getFullText();
  }

  /**
   * Generate a plugin class using ts-morph
   */
  generatePluginClass(pluginName: string, workflows: Record<string, any>): string {
    const fileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`;
    const sourceFile = this.project.createSourceFile(fileName);
    
    // Add imports
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@dotgithub/core',
      namedImports: ['DotGitHubPlugin', 'PluginContext'],
    });

    const className = `${this.toPascalCase(pluginName)}Plugin`;
    
    // Generate class
    const classDeclaration = sourceFile.addClass({
      name: className,
      isExported: true,
      implements: ['DotGitHubPlugin'],
      properties: [
        {
          name: 'name',
          type: 'string',
          initializer: `'${pluginName}'`,
          isReadonly: true,
        },
        {
          name: 'version',
          type: 'string',
          initializer: "'1.0.0'",
          isReadonly: true,
        },
        {
          name: 'description',
          type: 'string',
          initializer: `'Plugin for ${pluginName}'`,
          isReadonly: true,
        },
      ],
      methods: [
        {
          name: 'apply',
          isAsync: true,
          parameters: [{
            name: 'context',
            type: 'PluginContext',
          }],
          returnType: 'Promise<void>',
          statements: [
            '// Plugin implementation',
            'console.log(`Applying ${this.name} plugin`);',
          ],
        },
      ],
    });

    classDeclaration.addJsDoc({
      description: `Plugin for ${pluginName} functionality`,
    });

    return sourceFile.getFullText();
  }

  /**
   * Utility method to convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\/]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Utility method to convert string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascalCase = this.toPascalCase(str);
    return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
  }

  /**
   * Utility method to determine TypeScript type from value
   */
  private getTypeScriptType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'string[]';
    if (typeof value === 'object' && value !== null) return 'Record<string, any>';
    return 'any';
  }

  /**
   * Format generated code with proper indentation and spacing
   */
  formatCode(code: string): string {
    const fileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`;
    const sourceFile = this.project.createSourceFile(fileName, code);
    sourceFile.formatText();
    return sourceFile.getFullText();
  }

  /**
   * Save generated code to a file
   */
  async saveToFile(filePath: string, code: string): Promise<void> {
    const sourceFile = this.project.createSourceFile(filePath, code);
    await sourceFile.save();
  }
}

// Example usage
export function createExampleActionModule(): string {
  const generator = new TypeScriptGenerator();
  
  const actionInputs = {
    repository: 'string',
    ref: 'string',
    token: 'string',
    clean: 'boolean',
    fetchDepth: 'number',
  };

  return generator.generateActionModule('actions/checkout', actionInputs);
}

// Example plugin generation
export function createExamplePlugin(): string {
  const generator = new TypeScriptGenerator();
  
  const workflows = {
    ci: {
      name: 'CI',
      on: { push: { branches: ['main'] } },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { name: 'Checkout', uses: 'actions/checkout@v4' },
            { name: 'Test', run: 'npm test' },
          ],
        },
      },
    },
  };

  return generator.generatePluginClass('example', workflows);
}
