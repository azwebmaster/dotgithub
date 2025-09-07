import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateTemplate, createTemplateValidator } from './template-validator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('template-validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-validator-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createValidTemplate = (templatePath: string) => {
    fs.mkdirSync(templatePath, { recursive: true });
    fs.mkdirSync(path.join(templatePath, 'workflows'));
    fs.mkdirSync(path.join(templatePath, 'github-files'));

    const templateConfig = {
      name: 'valid-template',
      description: 'A valid template for testing',
      category: 'test',
      variables: {
        appName: {
          type: 'string',
          description: 'Application name',
          required: true
        },
        nodeVersion: {
          type: 'choice',
          description: 'Node.js version',
          options: ['16', '18', '20'],
          default: '18'
        }
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
      'name: CI for {{appName}}\n"on": push\njobs:\n  test:\n    runs-on: ubuntu-{{nodeVersion}}'
    );

    fs.writeFileSync(
      path.join(templatePath, 'github-files', 'dependabot.yml'),
      'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: "/"'
    );
  };

  describe('validateTemplate', () => {
    it('should validate a complete valid template', async () => {
      const templatePath = path.join(tempDir, 'valid-template');
      createValidTemplate(templatePath);

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for non-existent template', async () => {
      const result = await validateTemplate('/non/existent/path');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('TEMPLATE_NOT_FOUND');
    });

    it('should fail validation for missing template.json', async () => {
      const templatePath = path.join(tempDir, 'no-config');
      fs.mkdirSync(templatePath, { recursive: true });

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('MISSING_TEMPLATE_CONFIG');
    });

    it('should fail validation for invalid template.json', async () => {
      const templatePath = path.join(tempDir, 'invalid-config');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.writeFileSync(path.join(templatePath, 'template.json'), 'invalid json{');

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('INVALID_TEMPLATE_CONFIG');
    });

    it('should fail validation for missing template name', async () => {
      const templatePath = path.join(tempDir, 'no-name');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ description: 'No name template' })
      );

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('MISSING_TEMPLATE_NAME');
    });
  });

  describe('variable validation', () => {
    it('should validate variable types', async () => {
      const templatePath = path.join(tempDir, 'invalid-vars');
      fs.mkdirSync(templatePath, { recursive: true });

      const config = {
        name: 'invalid-vars',
        variables: {
          'invalid-name': { type: 'string' },
          validName: { type: 'invalid-type' },
          choiceVar: { type: 'choice' }, // missing options
          choiceWithBadDefault: {
            type: 'choice',
            options: ['a', 'b'],
            default: 'c'
          }
        }
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(config, null, 2)
      );

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_VARIABLE_NAME')).toBe(true);
      expect(result.errors.some(e => e.code === 'INVALID_VARIABLE_TYPE')).toBe(true);
      expect(result.errors.some(e => e.code === 'CHOICE_MISSING_OPTIONS')).toBe(true);
      expect(result.errors.some(e => e.code === 'INVALID_CHOICE_DEFAULT')).toBe(true);
    });

    it('should warn about missing variable descriptions in strict mode', async () => {
      const templatePath = path.join(tempDir, 'no-descriptions');
      fs.mkdirSync(templatePath, { recursive: true });

      const config = {
        name: 'no-descriptions',
        variables: {
          varWithoutDescription: { type: 'string', required: true }
        }
      };

      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify(config, null, 2)
      );

      const result = await validateTemplate(templatePath, { strictVariableValidation: true });

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_VARIABLE_DESCRIPTION')).toBe(true);
    });
  });

  describe('file structure validation', () => {
    it('should warn about empty template', async () => {
      const templatePath = path.join(tempDir, 'empty-template');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'empty-template' })
      );

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'EMPTY_TEMPLATE')).toBe(true);
    });

    it('should warn about empty directories', async () => {
      const templatePath = path.join(tempDir, 'empty-dirs');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));
      fs.mkdirSync(path.join(templatePath, 'github-files'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'empty-dirs' })
      );

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'EMPTY_WORKFLOWS_DIR')).toBe(true);
      expect(result.warnings.some(w => w.code === 'EMPTY_GITHUB_FILES_DIR')).toBe(true);
    });

    it('should warn about non-TypeScript files in workflows', async () => {
      const templatePath = path.join(tempDir, 'non-ts-workflows');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'non-ts-workflows' })
      );

      fs.writeFileSync(path.join(templatePath, 'workflows', 'workflow.yml'), 'name: test');

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'NON_TS_WORKFLOW_FILES')).toBe(true);
    });
  });

  describe('workflow file validation', () => {
    it('should warn about empty workflow files', async () => {
      const templatePath = path.join(tempDir, 'empty-workflow');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'empty-workflow' })
      );

      fs.writeFileSync(path.join(templatePath, 'workflows', 'empty.ts'), '   ');

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'EMPTY_WORKFLOW_FILE')).toBe(true);
    });

    it('should warn about workflows without proper structure', async () => {
      const templatePath = path.join(tempDir, 'invalid-workflow');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'invalid-workflow' })
      );

      fs.writeFileSync(path.join(templatePath, 'workflows', 'invalid.ts'), 'just some random content');

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'INVALID_WORKFLOW_STRUCTURE')).toBe(true);
    });

    it('should warn about workflows without template variables', async () => {
      const templatePath = path.join(tempDir, 'no-variables');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'no-variables' })
      );

      fs.writeFileSync(
        path.join(templatePath, 'workflows', 'static.ts'),
        'name: Static Workflow\n"on": push\njobs:\n  test:\n    runs-on: ubuntu-latest'
      );

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'NO_TEMPLATE_VARIABLES')).toBe(true);
    });
  });

  describe('GitHub files validation', () => {
    it('should warn about empty GitHub files', async () => {
      const templatePath = path.join(tempDir, 'empty-github-file');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'github-files'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'empty-github-file' })
      );

      fs.writeFileSync(path.join(templatePath, 'github-files', 'empty.txt'), '');

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'EMPTY_GITHUB_FILE')).toBe(true);
    });

    it('should validate dependabot.yml structure', async () => {
      const templatePath = path.join(tempDir, 'invalid-dependabot');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'github-files'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'invalid-dependabot' })
      );

      fs.writeFileSync(
        path.join(templatePath, 'github-files', 'dependabot.yml'),
        'just some invalid content'
      );

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'INVALID_DEPENDABOT_STRUCTURE')).toBe(true);
    });

    it('should validate CODEOWNERS file format', async () => {
      const templatePath = path.join(tempDir, 'invalid-codeowners');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'github-files'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'invalid-codeowners' })
      );

      fs.writeFileSync(
        path.join(templatePath, 'github-files', 'CODEOWNERS'),
        '# Comments\ninvalid-line-without-owner\n'
      );

      const result = await validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'INVALID_CODEOWNERS_LINE')).toBe(true);
    });
  });

  describe('validation options', () => {
    it('should skip file checks when checkFiles is false', async () => {
      const templatePath = path.join(tempDir, 'minimal-check');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'minimal-check' })
      );

      const result = await validateTemplate(templatePath, { checkFiles: false });

      expect(result.valid).toBe(true);
      expect(result.warnings.every(w => w.code !== 'EMPTY_TEMPLATE')).toBe(true);
    });

    it('should skip syntax checks when checkSyntax is false', async () => {
      const templatePath = path.join(tempDir, 'no-syntax-check');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.mkdirSync(path.join(templatePath, 'workflows'));
      
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({ name: 'no-syntax-check' })
      );

      fs.writeFileSync(path.join(templatePath, 'workflows', 'empty.ts'), '');

      const result = await validateTemplate(templatePath, { checkSyntax: false });

      expect(result.valid).toBe(true);
      expect(result.warnings.every(w => w.code !== 'EMPTY_WORKFLOW_FILE')).toBe(true);
    });
  });

  describe('createTemplateValidator', () => {
    it('should create validator with custom options', async () => {
      const validator = createTemplateValidator({
        checkFiles: false,
        strictVariableValidation: false
      });

      const templatePath = path.join(tempDir, 'custom-validator-test');
      fs.mkdirSync(templatePath, { recursive: true });
      fs.writeFileSync(
        path.join(templatePath, 'template.json'),
        JSON.stringify({
          name: 'custom-validator-test',
          variables: {
            varWithoutDesc: { type: 'string' }
          }
        })
      );

      const result = await validator.validateTemplate(templatePath);

      expect(result.valid).toBe(true);
      expect(result.warnings.every(w => w.code !== 'MISSING_VARIABLE_DESCRIPTION')).toBe(true);
    });
  });
});