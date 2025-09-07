import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateLoader, createTemplateLoader } from './template';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('template system', () => {
  let tempDir: string;
  let templateLoader: TemplateLoader;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotgithub-test-'));
    templateLoader = createTemplateLoader([tempDir]);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('TemplateLoader', () => {
    it('should load basic template configuration', async () => {
      const templatePath = path.join(tempDir, 'basic-template');
      fs.mkdirSync(templatePath, { recursive: true });

      const templateConfig = {
        name: 'basic-template',
        description: 'A basic template',
        category: 'test',
        variables: {
          appName: {
            type: 'string',
            description: 'Application name',
            required: true
          },
          nodeVersion: {
            type: 'string',
            default: '18',
            description: 'Node.js version'
          }
        }
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      const loaded = await templateLoader.loadTemplate('basic-template');
      expect(loaded.name).toBe('basic-template');
      expect(loaded.description).toBe('A basic template');
      expect(loaded.variables?.appName?.required).toBe(true);
      expect(loaded.variables?.nodeVersion?.default).toBe('18');
    });

    it('should process template with variable substitution', async () => {
      const templatePath = path.join(tempDir, 'variable-template');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));
      fs.mkdirSync(path.join(templatePath, 'github-files'));

      const templateConfig = {
        name: 'variable-template',
        variables: {
          appName: { type: 'string', required: true },
          nodeVersion: { type: 'string', default: '18' }
        },
        files: {
          workflows: ['ci.yml.ts'],
          github: ['dependabot.yml']
        }
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      fs.writeFileSync(
        path.join(templatePath, 'workflows', 'ci.yml.ts'),
        'name: CI for {{appName}}\nnode-version: {{nodeVersion}}'
      );

      fs.writeFileSync(
        path.join(templatePath, 'github-files', 'dependabot.yml'),
        'package-ecosystem: npm\ndirectory: "/{{appName}}/"'
      );

      const processed = await templateLoader.processTemplate('variable-template', {
        appName: 'my-app'
      });

      expect(processed.config.name).toBe('variable-template');
      expect(processed.workflows['ci.yml.ts']).toContain('CI for my-app');
      expect(processed.workflows['ci.yml.ts']).toContain('node-version: 18');
      expect(processed.githubFiles['dependabot.yml']).toContain('directory: "/my-app/"');
    });

    it('should validate required variables', async () => {
      const templatePath = path.join(tempDir, 'required-vars');
      fs.mkdirSync(templatePath, { recursive: true });

      const templateConfig = {
        name: 'required-vars',
        variables: {
          requiredVar: { type: 'string', required: true },
          optionalVar: { type: 'string', default: 'default-value' }
        }
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      await expect(
        templateLoader.processTemplate('required-vars', {})
      ).rejects.toThrow('Required variable "requiredVar" not provided');
    });

    it('should validate variable types', async () => {
      const templatePath = path.join(tempDir, 'typed-vars');
      fs.mkdirSync(templatePath, { recursive: true });

      const templateConfig = {
        name: 'typed-vars',
        variables: {
          numberVar: { type: 'number', default: 42 },
          boolVar: { type: 'boolean', default: true },
          choiceVar: { type: 'choice', options: ['option1', 'option2'], default: 'option1' }
        }
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      // Valid values
      const processed = await templateLoader.processTemplate('typed-vars', {
        numberVar: '123',
        boolVar: 'false',
        choiceVar: 'option2'
      });

      expect(typeof processed.config.variables?.numberVar).toBe('object');

      // Invalid number
      await expect(
        templateLoader.processTemplate('typed-vars', { numberVar: 'not-a-number' })
      ).rejects.toThrow('Variable "numberVar" must be a number');

      // Invalid choice
      await expect(
        templateLoader.processTemplate('typed-vars', { choiceVar: 'invalid-option' })
      ).rejects.toThrow('Variable "choiceVar" must be one of: option1, option2');
    });

    it('should handle templates without workflows or github files', async () => {
      const templatePath = path.join(tempDir, 'minimal-template');
      fs.mkdirSync(templatePath, { recursive: true });

      const templateConfig = {
        name: 'minimal-template',
        variables: {}
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      const processed = await templateLoader.processTemplate('minimal-template');
      
      expect(processed.workflows).toEqual({});
      expect(processed.githubFiles).toEqual({});
    });

    it('should throw error for missing template', async () => {
      await expect(
        templateLoader.loadTemplate('non-existent-template')
      ).rejects.toThrow('Template not found: non-existent-template');
    });

    it('should handle direct path to template', async () => {
      const templatePath = path.join(tempDir, 'direct-path-template');
      fs.mkdirSync(templatePath, { recursive: true });

      const templateConfig = {
        name: 'direct-path-template'
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      const loader = createTemplateLoader();
      const loaded = await loader.loadTemplate(templatePath);
      
      expect(loaded.name).toBe('direct-path-template');
    });
  });

  describe('variable substitution', () => {
    it('should handle multiple variable replacements', async () => {
      const templatePath = path.join(tempDir, 'multi-var');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));

      const templateConfig = {
        name: 'multi-var',
        variables: {
          name: { type: 'string', default: 'test' },
          version: { type: 'string', default: '1.0.0' }
        }
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      fs.writeFileSync(
        path.join(templatePath, 'workflows', 'test.ts'),
        'name: {{name}}\nversion: {{version}}\nfull: {{name}}-{{version}}'
      );

      const processed = await templateLoader.processTemplate('multi-var', {
        name: 'my-app',
        version: '2.1.0'
      });

      const content = processed.workflows['test.ts'];
      expect(content).toContain('name: my-app');
      expect(content).toContain('version: 2.1.0');
      expect(content).toContain('full: my-app-2.1.0');
    });

    it('should handle whitespace in variable placeholders', async () => {
      const templatePath = path.join(tempDir, 'whitespace-vars');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));

      const templateConfig = {
        name: 'whitespace-vars',
        variables: { name: { type: 'string', default: 'test' } }
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      fs.writeFileSync(
        path.join(templatePath, 'workflows', 'test.ts'),
        '{{ name }}\n{{  name  }}\n{{name}}'
      );

      const processed = await templateLoader.processTemplate('whitespace-vars', {
        name: 'my-app'
      });

      const lines = processed.workflows['test.ts']?.split('\n') || [];
      expect(lines[0]).toBe('my-app');
      expect(lines[1]).toBe('my-app');
      expect(lines[2]).toBe('my-app');
    });
  });
});