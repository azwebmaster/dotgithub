import { describe, it, expect } from 'vitest';
import { toProperCase, generateFunctionName, dedent } from './utils.js';

describe('Utils', () => {
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

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const result = toProperCase(longString);
      expect(result).toBe('A' + 'a'.repeat(999));
    });

    it('should handle unicode characters', () => {
      expect(toProperCase('café-node')).toBe('CafNode');
    });

    it('should handle emoji characters', () => {
      expect(toProperCase('🚀-node')).toBe('Node');
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

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const result = generateFunctionName(longString);
      expect(result).toBe('a'.repeat(1000));
    });

    it('should handle unicode characters', () => {
      expect(generateFunctionName('café-node')).toBe('cafNode');
    });

    it('should handle emoji characters', () => {
      expect(generateFunctionName('🚀-node')).toBe('node');
    });

    it('should handle JavaScript reserved words', () => {
      expect(generateFunctionName('class-node')).toBe('classNode');
    });

    it('should handle numbers at start', () => {
      expect(generateFunctionName('2setup-node')).toBe('2setupNode');
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

    it('should handle whitespace-only lines', () => {
      const text = `
        line 1
          
        line 3
      `;
      const result = dedent(text);
      expect(result).toBe('line 1\n  \nline 3');
    });

    it('should handle no indentation', () => {
      const text = `line 1
line 2
line 3`;
      const result = dedent(text);
      expect(result).toBe('line 1\nline 2\nline 3');
    });

    it('should handle mixed indentation', () => {
      const text = `
        line 1
      line 2
        line 3
      `;
      const result = dedent(text);
      expect(result).toBe('  line 1\nline 2\n  line 3');
    });

    it('should handle tabs and spaces', () => {
      const text = `
        line 1
        line 2
      `;
      const result = dedent(text);
      expect(result).toBe('line 1\nline 2');
    });

    it('should handle very deep indentation', () => {
      const text = `
            line 1
            line 2
            line 3
      `;
      const result = dedent(text);
      expect(result).toBe('line 1\nline 2\nline 3');
    });

    it('should handle single character lines', () => {
      const text = `
        a
        b
        c
      `;
      const result = dedent(text);
      expect(result).toBe('a\nb\nc');
    });

    it('should handle very long lines', () => {
      const longLine = 'a'.repeat(1000);
      const text = `
        ${longLine}
        ${longLine}
      `;
      const result = dedent(text);
      expect(result).toBe(`${longLine}\n${longLine}`);
    });

    it('should handle unicode characters', () => {
      const text = `
        café
        node
      `;
      const result = dedent(text);
      expect(result).toBe('café\nnode');
    });

    it('should handle emoji characters', () => {
      const text = `
        🚀
        node
      `;
      const result = dedent(text);
      expect(result).toBe('🚀\nnode');
    });

    it('should handle special characters', () => {
      const text = `
        @#$%
        node
      `;
      const result = dedent(text);
      expect(result).toBe('@#$%\nnode');
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

  describe('Edge Cases', () => {
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
