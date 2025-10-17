import { describe, it, expect } from 'vitest';
import { sanitizeVarName } from './file-utils.js';

describe('sanitizeVarName', () => {
  describe('kebab-case to camelCase conversion', () => {
    it('converts simple kebab-case', () => {
      expect(sanitizeVarName('my-action')).toBe('myAction');
      expect(sanitizeVarName('setup-node')).toBe('setupNode');
    });

    it('converts multiple hyphens', () => {
      expect(sanitizeVarName('create-pull-request')).toBe('createPullRequest');
      expect(sanitizeVarName('aws-s3-sync')).toBe('awsS3Sync');
    });

    it('handles single words without hyphens', () => {
      expect(sanitizeVarName('checkout')).toBe('checkout');
      expect(sanitizeVarName('cache')).toBe('cache');
    });
  });

  describe('special character handling', () => {
    it('removes invalid JavaScript identifier characters', () => {
      expect(sanitizeVarName('action@v4')).toBe('actionV4');
      expect(sanitizeVarName('my.action')).toBe('myAction');
      expect(sanitizeVarName('action/name')).toBe('actionName');
      expect(sanitizeVarName('action+plus')).toBe('actionPlus');
    });

    it('preserves valid characters', () => {
      expect(sanitizeVarName('action_name')).toBe('action_name');
      expect(sanitizeVarName('action$name')).toBe('action$name');
      expect(sanitizeVarName('actionName123')).toBe('actionName123');
    });

    it('handles multiple consecutive special characters', () => {
      expect(sanitizeVarName('action--name')).toBe('actionName');
      expect(sanitizeVarName('action@@name')).toBe('actionName');
    });
  });

  describe('number handling', () => {
    it('prefixes with underscore when starting with number', () => {
      expect(sanitizeVarName('123action')).toBe('_123action');
      expect(sanitizeVarName('4checkout')).toBe('_4checkout');
    });

    it('allows numbers in middle and end', () => {
      expect(sanitizeVarName('action123')).toBe('action123');
      expect(sanitizeVarName('setup2node')).toBe('setup2node');
    });

    it('handles number with special characters', () => {
      expect(sanitizeVarName('123-action')).toBe('_123Action');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(sanitizeVarName('')).toBe('action');
    });

    it('handles string with only special characters', () => {
      expect(sanitizeVarName('---')).toBe('action');
      expect(sanitizeVarName('@@@')).toBe('action');
    });

    it('handles single underscore', () => {
      expect(sanitizeVarName('_')).toBe('action');
    });

    it('handles very long names', () => {
      const longName = 'very-long-action-name-with-many-hyphens-and-words';
      const result = sanitizeVarName(longName);
      expect(result).toBe('veryLongActionNameWithManyHyphensAndWords');
    });
  });

  describe('real-world GitHub action names', () => {
    it('handles common GitHub action patterns', () => {
      expect(sanitizeVarName('actions/checkout')).toBe('actionsCheckout');
      expect(sanitizeVarName('actions/setup-node')).toBe('actionsSetupNode');
      expect(sanitizeVarName('github/codeql-action')).toBe(
        'githubCodeqlAction'
      );
    });

    it('handles versioned actions', () => {
      expect(sanitizeVarName('checkout@v4')).toBe('checkoutV4');
      expect(sanitizeVarName('setup-node@v3.8.1')).toBe('setupNodeV381');
    });

    it('handles organization/repo patterns', () => {
      expect(sanitizeVarName('microsoft/setup-msbuild')).toBe(
        'microsoftSetupMsbuild'
      );
      expect(sanitizeVarName('aws-actions/configure-aws-credentials')).toBe(
        'awsActionsConfigureAwsCredentials'
      );
    });
  });
});
