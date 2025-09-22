import { describe, it, expect, beforeEach } from 'vitest';
import { TypeScriptGenerator, createExampleActionModule, createExamplePlugin } from './ts-morph-example';

describe('TypeScriptGenerator', () => {
  let generator: TypeScriptGenerator;

  beforeEach(() => {
    generator = new TypeScriptGenerator();
  });

  describe('generateActionInputsInterface', () => {
    it('should generate a TypeScript interface for action inputs', () => {
      const inputs = {
        repository: 'string',
        ref: 'string',
        token: 'string',
        clean: 'boolean',
        fetchDepth: 'number',
      };

      const result = generator.generateActionInputsInterface('actions/checkout', inputs);

      expect(result).toContain('export interface ActionsCheckoutInputs');
      expect(result).toContain('repository?: string');
      expect(result).toContain('ref?: string');
      expect(result).toContain('token?: string');
      expect(result).toContain('clean?: string');
      expect(result).toContain('fetchDepth?: string');
      expect(result).toContain('/**');
      expect(result).toContain('Input parameters for the actions/checkout action');
    });
  });

  describe('generateActionFactoryFunction', () => {
    it('should generate a factory function for creating action steps', () => {
      const inputs = {
        repository: 'string',
        ref: 'string',
      };

      const result = generator.generateActionFactoryFunction('actions/checkout', inputs);

      expect(result).toContain('export function actionsCheckout');
      expect(result).toContain('inputs?: ActionsCheckoutInputs | undefined');
      expect(result).toContain('return createStep("actions/checkout"');
      expect(result).toContain('/**');
      expect(result).toContain('Creates a step for the actions/checkout action');
    });
  });

  describe('generateActionModule', () => {
    it('should generate a complete action module with interface and factory', () => {
      const inputs = {
        repository: 'string',
        ref: 'string',
      };

      const result = generator.generateActionModule('actions/checkout', inputs);

      expect(result).toContain('import { GitHubStep, createStep } from "@dotgithub/core"');
      expect(result).toContain('export interface ActionsCheckoutInputs');
      expect(result).toContain('export function actionsCheckout');
      expect(result).toContain('return createStep("actions/checkout"');
    });
  });

  describe('generatePluginClass', () => {
    it('should generate a plugin class', () => {
      const workflows = {
        ci: {
          name: 'CI',
          on: { push: { branches: ['main'] } },
        },
      };

      const result = generator.generatePluginClass('example', workflows);

      expect(result).toContain('import { DotGitHubPlugin, PluginContext } from "@dotgithub/core"');
      expect(result).toContain('export class ExamplePlugin');
      expect(result).toContain('implements DotGitHubPlugin');
      expect(result).toContain("name: string = 'example'");
      expect(result).toContain("version: string = '1.0.0'");
      expect(result).toContain('async apply(context: PluginContext)');
    });
  });

  describe('utility methods', () => {
    it('should convert strings to PascalCase', () => {
      // Access private method through type assertion for testing
      const generator = new TypeScriptGenerator() as any;
      expect(generator.toPascalCase('actions/checkout')).toBe('ActionsCheckout');
      expect(generator.toPascalCase('my-action')).toBe('MyAction');
      expect(generator.toPascalCase('my_action')).toBe('MyAction');
    });

    it('should convert strings to camelCase', () => {
      const generator = new TypeScriptGenerator() as any;
      expect(generator.toCamelCase('actions/checkout')).toBe('actionsCheckout');
      expect(generator.toCamelCase('my-action')).toBe('myAction');
      expect(generator.toCamelCase('my_action')).toBe('myAction');
    });

    it('should determine TypeScript types from values', () => {
      const generator = new TypeScriptGenerator() as any;
      expect(generator.getTypeScriptType('string')).toBe('string');
      expect(generator.getTypeScriptType(123)).toBe('number');
      expect(generator.getTypeScriptType(true)).toBe('boolean');
      expect(generator.getTypeScriptType(['a', 'b'])).toBe('string[]');
      expect(generator.getTypeScriptType({})).toBe('Record<string, any>');
      expect(generator.getTypeScriptType(null)).toBe('any');
    });
  });

  describe('formatCode', () => {
    it('should format generated code', () => {
      const unformattedCode = `export interface Test{name:string;value:number;}`;
      const formattedCode = generator.formatCode(unformattedCode);
      
      expect(formattedCode).toContain('export interface Test {');
      expect(formattedCode).toContain('name: string;');
      expect(formattedCode).toContain('value: number;');
    });
  });
});

describe('Example functions', () => {
  it('should create example action module', () => {
    const result = createExampleActionModule();
    
    expect(result).toContain('import { GitHubStep, createStep } from "@dotgithub/core"');
    expect(result).toContain('export interface ActionsCheckoutInputs');
    expect(result).toContain('export function actionsCheckout');
    expect(result).toContain('repository?: string');
    expect(result).toContain('ref?: string');
    expect(result).toContain('token?: string');
    expect(result).toContain('clean?: string');
    expect(result).toContain('fetchDepth?: string');
  });

  it('should create example plugin', () => {
    const result = createExamplePlugin();
    
    expect(result).toContain('import { DotGitHubPlugin, PluginContext } from "@dotgithub/core"');
    expect(result).toContain('export class ExamplePlugin');
    expect(result).toContain('implements DotGitHubPlugin');
    expect(result).toContain("name: string = 'example'");
    expect(result).toContain('async apply(context: PluginContext)');
  });
});
