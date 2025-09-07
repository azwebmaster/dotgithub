import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateGithubFiles,
  generateDependabotConfig,
  generateCodeowners,
  generateIssueTemplate,
  generatePullRequestTemplate,
  generateFundingConfig,
  generateSecurityPolicy
} from './github-files-generator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('github-files-generator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-files-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('generateGithubFiles', () => {
    it('should generate files in specified directory', () => {
      const files = {
        'dependabot.yml': 'version: 2\nupdates: []',
        'CODEOWNERS': '* @owner',
        'workflows/ci.yml': 'name: CI'
      };

      const result = generateGithubFiles({
        outputDir: tempDir,
        files,
        createDirectories: true
      });

      expect(result.generatedFiles).toHaveLength(3);
      expect(fs.existsSync(path.join(tempDir, 'dependabot.yml'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'CODEOWNERS'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'workflows/ci.yml'))).toBe(true);
      expect(result.createdDirectories).toContain(path.join(tempDir, 'workflows'));
    });

    it('should skip existing files when overwrite is false', () => {
      const existingFile = path.join(tempDir, 'existing.txt');
      fs.writeFileSync(existingFile, 'existing content');

      const files = {
        'existing.txt': 'new content',
        'new.txt': 'new file content'
      };

      const result = generateGithubFiles({
        outputDir: tempDir,
        files,
        overwrite: false
      });

      expect(result.generatedFiles).toHaveLength(1);
      expect(result.skippedFiles).toHaveLength(1);
      expect(fs.readFileSync(existingFile, 'utf8')).toBe('existing content');
    });

    it('should overwrite existing files when overwrite is true', () => {
      const existingFile = path.join(tempDir, 'existing.txt');
      fs.writeFileSync(existingFile, 'existing content');

      const files = {
        'existing.txt': 'new content'
      };

      const result = generateGithubFiles({
        outputDir: tempDir,
        files,
        overwrite: true
      });

      expect(result.generatedFiles).toHaveLength(1);
      expect(result.skippedFiles).toHaveLength(0);
      expect(fs.readFileSync(existingFile, 'utf8')).toBe('new content');
    });
  });

  describe('generateDependabotConfig', () => {
    it('should generate valid dependabot.yml', () => {
      const updates = [
        {
          'package-ecosystem': 'npm' as const,
          directory: '/',
          schedule: {
            interval: 'weekly' as const,
            day: 'monday'
          },
          'open-pull-requests-limit': 10,
          reviewers: ['@reviewer1'],
          labels: ['dependencies']
        }
      ];

      const yaml = generateDependabotConfig(updates);

      expect(yaml).toContain('version: 2');
      expect(yaml).toContain('package-ecosystem: npm');
      expect(yaml).toContain('directory: /');
      expect(yaml).toContain('interval: weekly');
      expect(yaml).toContain('day: monday');
      expect(yaml).toContain('open-pull-requests-limit: 10');
    });
  });

  describe('generateCodeowners', () => {
    it('should generate CODEOWNERS file', () => {
      const entries = [
        { pattern: '*', owners: ['@global-owner1', '@global-owner2'] },
        { pattern: '*.js', owners: ['@js-owner'] },
        { pattern: '/docs/*', owners: ['@docs-team'] }
      ];

      const content = generateCodeowners(entries);

      expect(content).toContain('# This file defines code ownership');
      expect(content).toContain('* @global-owner1 @global-owner2');
      expect(content).toContain('*.js @js-owner');
      expect(content).toContain('/docs/* @docs-team');
    });
  });

  describe('generateIssueTemplate', () => {
    it('should generate issue template YAML', () => {
      const template = {
        name: 'Bug Report',
        about: 'Create a report to help us improve',
        title: '[Bug]: ',
        labels: ['bug', 'triage'],
        assignees: ['maintainer'],
        body: [
          {
            type: 'markdown' as const,
            attributes: {
              value: '## Bug Report\nThanks for reporting!'
            }
          },
          {
            type: 'textarea' as const,
            id: 'description',
            attributes: {
              label: 'Describe the bug',
              description: 'A clear and concise description',
              placeholder: 'Tell us what happened'
            },
            validations: {
              required: true
            }
          }
        ]
      };

      const yaml = generateIssueTemplate(template);

      expect(yaml).toContain('name: Bug Report');
      expect(yaml).toContain('about: Create a report to help us improve');
      expect(yaml).toContain('type: markdown');
      expect(yaml).toContain('type: textarea');
      expect(yaml).toContain('required: true');
    });
  });

  describe('generatePullRequestTemplate', () => {
    it('should generate pull request template', () => {
      const template = {
        description: '## Description\nPlease describe your changes here.',
        checklist: [
          'I have tested my changes',
          'I have updated the documentation',
          'My code follows the style guidelines'
        ],
        additionalSections: [
          {
            title: 'Breaking Changes',
            content: 'List any breaking changes here.'
          }
        ]
      };

      const content = generatePullRequestTemplate(template);

      expect(content).toContain('## Description');
      expect(content).toContain('Please describe your changes here.');
      expect(content).toContain('## Checklist');
      expect(content).toContain('- [ ] I have tested my changes');
      expect(content).toContain('## Breaking Changes');
      expect(content).toContain('List any breaking changes here.');
    });
  });

  describe('generateFundingConfig', () => {
    it('should generate FUNDING.yml', () => {
      const config = {
        github: ['sponsor1', 'sponsor2'],
        patreon: 'mypatreon',
        ko_fi: 'mykofi',
        custom: ['https://example.com/donate']
      };

      const yaml = generateFundingConfig(config);

      expect(yaml).toContain('github:');
      expect(yaml).toContain('- sponsor1');
      expect(yaml).toContain('- sponsor2');
      expect(yaml).toContain('patreon: mypatreon');
      expect(yaml).toContain('ko_fi: mykofi');
      expect(yaml).toContain('custom:');
      expect(yaml).toContain('- https://example.com/donate');
    });
  });

  describe('generateSecurityPolicy', () => {
    it('should generate SECURITY.md', () => {
      const policy = {
        reportingInstructions: 'Please report security vulnerabilities to security@example.com',
        supportedVersions: [
          { version: '1.x', supported: true },
          { version: '0.x', supported: false }
        ],
        contactInfo: {
          email: 'security@example.com',
          url: 'https://example.com/security'
        }
      };

      const content = generateSecurityPolicy(policy);

      expect(content).toContain('# Security Policy');
      expect(content).toContain('## Supported Versions');
      expect(content).toContain('| 1.x | ✅ |');
      expect(content).toContain('| 0.x | ❌ |');
      expect(content).toContain('## Reporting a Vulnerability');
      expect(content).toContain('security@example.com');
      expect(content).toContain('## Contact Information');
      expect(content).toContain('**Email:** security@example.com');
      expect(content).toContain('**URL:** https://example.com/security');
    });
  });
});