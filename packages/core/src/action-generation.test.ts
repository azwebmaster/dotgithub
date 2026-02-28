import { describe, it, expect } from 'vitest';
import { toProperCase, generateFunctionName, dedent } from './utils.js';
import { addImportsToGeneratedTypes, sanitizeVarName } from './file-utils.js';

describe('Action Generation Logic', () => {
  describe('Utils Functions', () => {
    describe('toProperCase', () => {
      it('should convert kebab-case to ProperCase', () => {
        expect(toProperCase('setup-node')).toBe('SetupNode');
      });

      it('should convert snake_case to ProperCase', () => {
        expect(toProperCase('setup_node')).toBe('SetupNode');
      });

      it('should convert spaces to ProperCase', () => {
        expect(toProperCase('setup node')).toBe('SetupNode');
      });

      it('should handle mixed separators', () => {
        expect(toProperCase('setup-node_v2')).toBe('SetupNodeV2');
      });

      it('should handle special characters', () => {
        expect(toProperCase('setup@#$%node')).toBe('SetupNode');
      });

      it('should handle numbers', () => {
        expect(toProperCase('setup-node-v2')).toBe('SetupNodeV2');
      });

      it('should handle empty string', () => {
        expect(toProperCase('')).toBe('');
      });

      it('should handle only special characters', () => {
        expect(toProperCase('@#$%^&*()')).toBe('');
      });

      it('should handle single character', () => {
        expect(toProperCase('a')).toBe('A');
      });

      it('should handle multiple consecutive separators', () => {
        expect(toProperCase('setup---node')).toBe('SetupNode');
      });

      it('should handle leading and trailing separators', () => {
        expect(toProperCase('-setup-node-')).toBe('SetupNode');
      });

      it('should handle mixed case', () => {
        expect(toProperCase('Setup-Node')).toBe('SetupNode');
      });
    });

    describe('generateFunctionName', () => {
      it('should convert action name to camelCase function name', () => {
        expect(generateFunctionName('setup-node')).toBe('setupNode');
      });

      it('should convert snake_case to camelCase', () => {
        expect(generateFunctionName('setup_node')).toBe('setupNode');
      });

      it('should convert spaces to camelCase', () => {
        expect(generateFunctionName('setup node')).toBe('setupNode');
      });

      it('should handle mixed separators', () => {
        expect(generateFunctionName('setup-node_v2')).toBe('setupNodeV2');
      });

      it('should handle special characters', () => {
        expect(generateFunctionName('setup@#$%node')).toBe('setupNode');
      });

      it('should handle numbers', () => {
        expect(generateFunctionName('setup-node-v2')).toBe('setupNodeV2');
      });

      it('should handle empty string', () => {
        expect(generateFunctionName('')).toBe('');
      });

      it('should handle only special characters', () => {
        expect(generateFunctionName('@#$%^&*()')).toBe('');
      });

      it('should handle single character', () => {
        expect(generateFunctionName('a')).toBe('a');
      });

      it('should handle multiple consecutive separators', () => {
        expect(generateFunctionName('setup---node')).toBe('setupNode');
      });

      it('should handle leading and trailing separators', () => {
        expect(generateFunctionName('-setup-node-')).toBe('setupNode');
      });

      it('should handle mixed case', () => {
        expect(generateFunctionName('Setup-Node')).toBe('setupNode');
      });
    });

    describe('dedent', () => {
      it('should remove common indentation', () => {
        const text = `
          line 1
          line 2
          line 3
        `;
        const result = dedent(text);
        expect(result).toBe('line 1\nline 2\nline 3');
      });

      it('should handle empty string', () => {
        expect(dedent('')).toBe('');
      });

      it('should handle single line', () => {
        expect(dedent('  single line')).toBe('single line');
      });

      it('should handle lines with different indentation', () => {
        const text = `
          line 1
            line 2
          line 3
        `;
        const result = dedent(text);
        expect(result).toBe('line 1\n  line 2\nline 3');
      });

      it('should handle empty lines', () => {
        const text = `
          line 1

          line 3
        `;
        const result = dedent(text);
        expect(result).toBe('line 1\n\nline 3');
      });

      it('should handle leading and trailing empty lines', () => {
        const text = `

          line 1
          line 2

        `;
        const result = dedent(text);
        expect(result).toBe('line 1\nline 2');
      });

      it('should handle only empty lines', () => {
        const text = `

        `;
        const result = dedent(text);
        expect(result).toBe('');
      });

      it('should handle no indentation', () => {
        const text = `line 1
line 2
line 3`;
        const result = dedent(text);
        expect(result).toBe('line 1\nline 2\nline 3');
      });
    });
  });

  describe('File Utils Functions', () => {
    describe('sanitizeVarName', () => {
      it('should convert kebab-case to camelCase', () => {
        expect(sanitizeVarName('setup-node')).toBe('setupNode');
      });

      it('should handle snake_case', () => {
        expect(sanitizeVarName('setup_node')).toBe('setup_node');
      });

      it('should handle spaces', () => {
        expect(sanitizeVarName('setup node')).toBe('setupNode');
      });

      it('should handle special characters', () => {
        expect(sanitizeVarName('setup@#$%node')).toBe('setup$Node');
      });

      it('should handle numbers', () => {
        expect(sanitizeVarName('setup-node-v2')).toBe('setupNodeV2');
      });

      it('should handle leading numbers', () => {
        expect(sanitizeVarName('2setup-node')).toBe('_2setupNode');
      });

      it('should handle empty string', () => {
        expect(sanitizeVarName('')).toBe('action');
      });

      it('should handle only special characters', () => {
        expect(sanitizeVarName('@#$%^&*()')).toBe('$');
      });

      it('should handle single underscore', () => {
        expect(sanitizeVarName('_')).toBe('action');
      });

      it('should handle multiple consecutive special characters', () => {
        expect(sanitizeVarName('setup---node')).toBe('setupNode');
      });

      it('should handle mixed case', () => {
        expect(sanitizeVarName('Setup-Node')).toBe('SetupNode');
      });
    });

    describe('addImportsToGeneratedTypes', () => {
      it('should add necessary imports to generated code', () => {
        const generatedCode = `
          export class TestAction extends ActionConstruct {
            protected readonly uses = "actions/checkout";
            protected readonly fallbackRef = "v4";
            protected readonly outputs = TestActionOutputs;
          }
        `;

        const result = addImportsToGeneratedTypes(generatedCode);

        expect(result).toContain('import { ActionConstruct } from "@dotgithub/core"');
      });

      it('should handle code without imports', () => {
        const generatedCode = 'export class TestAction {}';

        const result = addImportsToGeneratedTypes(generatedCode);

        expect(result).toContain('export class TestAction {}');
      });

      it('should handle code with GitHubOutputValue usage', () => {
        const generatedCode = `
          export const TestActionOutputs = {
            result: new GitHubOutputValue("result")
          };
        `;

        const result = addImportsToGeneratedTypes(generatedCode);

        expect(result).toContain('import { GitHubOutputValue } from "@dotgithub/core"');
      });

      it('should handle code with ActionCollection usage', () => {
        const generatedCode = `
          export function testAction(this: ActionCollection, inputs?: TestActionInputs) {
            return createStep("actions/test", inputs);
          }
        `;

        const result = addImportsToGeneratedTypes(generatedCode);

        expect(result).toContain('import type { ActionCollection } from "@dotgithub/core"');
      });

      it('should handle empty code', () => {
        const result = addImportsToGeneratedTypes('');

        expect(result).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      expect(() => toProperCase(longString)).not.toThrow();
      expect(() => generateFunctionName(longString)).not.toThrow();
      expect(() => dedent(longString)).not.toThrow();
    });

    it('should handle unicode characters', () => {
      expect(toProperCase('café-node')).toBe('CafNode');
      expect(generateFunctionName('café-node')).toBe('cafNode');
      expect(sanitizeVarName('café-node')).toBe('cafNode');
    });

    it('should handle emoji characters', () => {
      expect(toProperCase('🚀-node')).toBe('Node');
      expect(generateFunctionName('🚀-node')).toBe('node');
      expect(sanitizeVarName('🚀-node')).toBe('Node');
    });

    it('should handle special characters', () => {
      expect(toProperCase('@#$%^&*()')).toBe('');
      expect(generateFunctionName('@#$%^&*()')).toBe('');
      expect(sanitizeVarName('@#$%^&*()')).toBe('$');
    });

    it('should handle numbers at start', () => {
      expect(sanitizeVarName('2setup-node')).toBe('_2setupNode');
    });

    it('should handle JavaScript reserved words', () => {
      expect(generateFunctionName('class-node')).toBe('classNode');
    });

    it('should handle mixed line endings', () => {
      const text = '  line 1\r\n  line 2\n  line 3\r';
      const result = dedent(text);
      expect(result).toBe('line 1\r\nline 2\nline 3\r');
    });

    it('should handle zero indentation', () => {
      const text = 'line 1\nline 2\nline 3';
      const result = dedent(text);
      expect(result).toBe('line 1\nline 2\nline 3');
    });

    it('should handle all lines with same indentation', () => {
      const text = '  line 1\n  line 2\n  line 3';
      const result = dedent(text);
      expect(result).toBe('line 1\nline 2\nline 3');
    });
  });

  describe('Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      // @ts-expect-error Testing runtime behavior
      expect(() => toProperCase(null)).toThrow();
      // @ts-expect-error Testing runtime behavior
      expect(() => toProperCase(undefined)).toThrow();
      // @ts-expect-error Testing runtime behavior
      expect(() => generateFunctionName(null)).toThrow();
      // @ts-expect-error Testing runtime behavior
      expect(() => generateFunctionName(undefined)).toThrow();
      // @ts-expect-error Testing runtime behavior
      expect(() => dedent(null)).toThrow();
      // @ts-expect-error Testing runtime behavior
      expect(() => dedent(undefined)).toThrow();
    });

    it('should handle very large inputs', () => {
      const largeInput = 'a'.repeat(100000);
      expect(() => toProperCase(largeInput)).not.toThrow();
      expect(() => generateFunctionName(largeInput)).not.toThrow();
      expect(() => dedent(largeInput)).not.toThrow();
    });

    it('should handle inputs with only whitespace', () => {
      expect(toProperCase('   ')).toBe('');
      expect(generateFunctionName('   ')).toBe('');
      expect(dedent('   ')).toBe('');
    });

    it('should handle inputs with only newlines', () => {
      expect(dedent('\n\n\n')).toBe('');
    });

    it('should handle inputs with only tabs', () => {
      expect(toProperCase('\t\t\t')).toBe('');
      expect(generateFunctionName('\t\t\t')).toBe('');
      expect(dedent('\t\t\t')).toBe('');
    });
  });
});
