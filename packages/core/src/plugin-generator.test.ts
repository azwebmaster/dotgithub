import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createPluginFromFiles, generatePluginFromGitHubFiles } from './plugin-generator';
import type { DotGithubContext } from './context';

// Mock dependencies
vi.mock('./git', () => ({
  cloneRepo: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./github', () => ({
  getDefaultBranch: vi.fn().mockResolvedValue('main')
}));

describe('Plugin Generator', () => {
  let tempDir: string;
  let mockContext: DotGithubContext;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-test-'));
    
    // Create mock context
    mockContext = {
      config: null as any,
      configPath: '',
      outputPath: '',
      relativePath: (p: string) => p,
      resolvePath: (p: string) => path.resolve(tempDir, p)
    } as unknown as DotGithubContext;
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('createPluginFromFiles', () => {
    it('should generate a plugin with workflow and resource files', async () => {
      // Create test .github directory structure
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');
      
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create test workflow file
      const testWorkflow = `name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: echo "Hello World"`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), testWorkflow);

      // Create test resource file
      const testResource = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"`;

      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), testResource);

      // Generate plugin
      const result = await createPluginFromFiles({
        pluginName: 'test-plugin',
        githubFilesPath: githubDir,
        description: 'Test plugin for function-based structure',
        context: mockContext
      });

      // Verify plugin content
      expect(result.filesFound).toHaveLength(2);
      expect(result.filesFound).toContain('workflows/ci.yml');
      expect(result.filesFound).toContain('resources/dependabot.yml');
      expect(result.generatedFiles).toHaveLength(2);

      // Check main plugin content
      expect(result.pluginContent).toContain('export class TestPluginPlugin');
      expect(result.pluginContent).toContain('implements DotGitHubPlugin');
      expect(result.pluginContent).toContain('async applyWorkflows(context: PluginContext)');
      expect(result.pluginContent).toContain('async applyResources(context: PluginContext)');
      expect(result.pluginContent).toContain('import { ciHandler } from \'./workflows/ci\';');
      expect(result.pluginContent).toContain('import { dependabotHandler } from \'./resources/dependabot\';');

      // Check workflow file generation
      const workflowFile = result.generatedFiles.find(f => f.type === 'workflow');
      expect(workflowFile).toBeDefined();
      expect(workflowFile?.name).toBe('ci');
      expect(workflowFile?.content).toContain('export async function ciHandler(context: PluginContext): Promise<void>');
      expect(workflowFile?.content).toContain('import type { GitHubWorkflow, PluginContext } from \'@dotgithub/core\'');

      // Check resource file generation
      const resourceFile = result.generatedFiles.find(f => f.type === 'resource');
      expect(resourceFile).toBeDefined();
      expect(resourceFile?.name).toBe('dependabot');
      expect(resourceFile?.content).toContain('export async function dependabotHandler(context: PluginContext): Promise<void>');
      expect(resourceFile?.content).toContain('import type { PluginContext } from \'@dotgithub/core\'');

      // Check that plugin calls functions with context
      expect(result.pluginContent).toContain('ciHandler(context)');
      expect(result.pluginContent).toContain('dependabotHandler(context)');
    });

    it('should handle plugins with only workflow files', async () => {
      // Create test .github directory with only workflows
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      
      fs.mkdirSync(workflowsDir, { recursive: true });

      const testWorkflow = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), testWorkflow);

      const result = await createPluginFromFiles({
        pluginName: 'ci-only',
        githubFilesPath: githubDir,
        description: 'CI-only plugin',
        context: mockContext
      });

      expect(result.filesFound).toHaveLength(1);
      expect(result.filesFound).toContain('workflows/ci.yml');
      expect(result.generatedFiles).toHaveLength(1);
      
      expect(result.pluginContent).toContain('async applyWorkflows(context: PluginContext)');
      expect(result.pluginContent).toContain('async applyResources(_context: PluginContext)');
      expect(result.pluginContent).toContain('// This plugin doesn\'t define any resources');
    });

    it('should handle plugins with only resource files', async () => {
      // Create test .github directory with only resources
      const githubDir = path.join(tempDir, '.github');
      const resourcesDir = path.join(githubDir, 'resources');
      
      fs.mkdirSync(resourcesDir, { recursive: true });

      const testResource = `version: 2
updates:
  - package-ecosystem: "npm"`;

      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), testResource);

      const result = await createPluginFromFiles({
        pluginName: 'resources-only',
        githubFilesPath: githubDir,
        description: 'Resources-only plugin',
        context: mockContext
      });

      expect(result.filesFound).toHaveLength(1);
      expect(result.filesFound).toContain('resources/dependabot.yml');
      expect(result.generatedFiles).toHaveLength(1);
      
      expect(result.pluginContent).toContain('async applyWorkflows(_context: PluginContext)');
      expect(result.pluginContent).toContain('// This plugin doesn\'t define any workflows');
      expect(result.pluginContent).toContain('async applyResources(context: PluginContext)');
    });

    it('should handle non-YAML resource files', async () => {
      // Create test .github directory with text files
      const githubDir = path.join(tempDir, '.github');
      
      fs.mkdirSync(githubDir, { recursive: true });

      const readmeContent = `# Project README
This is a test project.`;

      fs.writeFileSync(path.join(githubDir, 'README.md'), readmeContent);

      const result = await createPluginFromFiles({
        pluginName: 'readme-plugin',
        githubFilesPath: githubDir,
        description: 'Plugin with README',
        context: mockContext
      });

      expect(result.filesFound).toHaveLength(1);
      expect(result.filesFound).toContain('README.md');
      expect(result.generatedFiles).toHaveLength(1);
      
      const resourceFile = result.generatedFiles.find(f => f.type === 'resource');
      expect(resourceFile).toBeDefined();
      expect(resourceFile?.content).toContain('export async function readmeHandler(context: PluginContext): Promise<void>');
      expect(resourceFile?.content).toContain("'# Project README\\nThis is a test project.'");
    });

    it('should validate plugin name', async () => {
      const githubDir = path.join(tempDir, '.github');
      fs.mkdirSync(githubDir, { recursive: true });

      await expect(async () => {
        await createPluginFromFiles({
          pluginName: '',
          githubFilesPath: githubDir,
          context: mockContext
        });
      }).rejects.toThrow('Plugin name is required and cannot be empty');

      await expect(async () => {
        await createPluginFromFiles({
          pluginName: '   ',
          githubFilesPath: githubDir,
          context: mockContext
        });
      }).rejects.toThrow('Plugin name is required and cannot be empty');
    });

    it('should validate GitHub files path', async () => {
      await expect(async () => {
        await createPluginFromFiles({
          pluginName: 'test',
          githubFilesPath: '',
          context: mockContext
        });
      }).rejects.toThrow('GitHub files path is required and cannot be empty');

      await expect(async () => {
        await createPluginFromFiles({
          pluginName: 'test',
          githubFilesPath: '/nonexistent/path',
          context: mockContext
        });
      }).rejects.toThrow('Path does not exist: /nonexistent/path');
    });

    it('should handle empty directory', async () => {
      const githubDir = path.join(tempDir, '.github');
      fs.mkdirSync(githubDir, { recursive: true });

      await expect(async () => {
        await createPluginFromFiles({
          pluginName: 'test',
          githubFilesPath: githubDir,
          context: mockContext
        });
      }).rejects.toThrow('No files found in:');
    });

    it('should handle invalid YAML gracefully', async () => {
      // Create test .github directory with invalid YAML
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      
      fs.mkdirSync(workflowsDir, { recursive: true });

      const invalidYaml = `name: Test Workflow
on:
  push:
    branches: [main
jobs:
  test:
    runs-on: ubuntu-latest`;

      fs.writeFileSync(path.join(workflowsDir, 'invalid.yml'), invalidYaml);

      const result = await createPluginFromFiles({
        pluginName: 'invalid-yaml',
        githubFilesPath: githubDir,
        description: 'Plugin with invalid YAML',
        context: mockContext
      });

      // Should still generate the plugin, but with string content
      expect(result.filesFound).toHaveLength(1);
      expect(result.generatedFiles).toHaveLength(1);
      
      const workflowFile = result.generatedFiles.find(f => f.type === 'workflow');
      expect(workflowFile).toBeDefined();
      expect(workflowFile?.content).toContain('export async function invalidHandler(context: PluginContext): Promise<void>');
    });

    it('should extract actions from workflows when autoAddActions is enabled', async () => {
      // Create test .github directory with workflow containing actions
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      
      fs.mkdirSync(workflowsDir, { recursive: true });

      const testWorkflow = `name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'`;

      fs.writeFileSync(path.join(workflowsDir, 'test.yml'), testWorkflow);

      // Mock the autoAddActionsToConfig function to avoid actual API calls
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      const logSpy = vi.fn();
      const warnSpy = vi.fn();
      console.log = logSpy;
      console.warn = warnSpy;

      try {
        const result = await createPluginFromFiles({
          pluginName: 'test-plugin',
          githubFilesPath: githubDir,
          context: mockContext,
          autoAddActions: true
        });

        // Should generate the plugin successfully
        expect(result.filesFound).toHaveLength(1);
        expect(result.generatedFiles).toHaveLength(1);
        
        // Should have logged about scanning for actions
        expect(logSpy).toHaveBeenCalledWith('🔍 Scanning workflows for actions to auto-add...');
        
        // Should have found actions (though they won't be added due to mocking)
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Found 2 unique actions to add: actions/checkout, actions/setup-node'));
      } finally {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
      }
    });
  });

  describe('generatePluginFromGitHubFiles', () => {
    it('should generate plugin from local path', async () => {
      // Create test .github directory structure
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      
      fs.mkdirSync(workflowsDir, { recursive: true });

      const testWorkflow = `name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), testWorkflow);

      const result = await generatePluginFromGitHubFiles({
        pluginName: 'local-test',
        source: tempDir,
        description: 'Local test plugin',
        context: mockContext
      });

      expect(result.pluginName).toBe('local-test');
      expect(result.filesFound).toHaveLength(1);
      expect(result.filesFound).toContain('workflows/ci.yml');
      expect(result.generatedFiles).toHaveLength(1);
      
      // Check that files were actually written
      expect(fs.existsSync(result.pluginPath)).toBe(true);
      expect(fs.existsSync(path.join(path.dirname(result.pluginPath), 'workflows', 'ci.ts'))).toBe(true);
    });

    it('should handle overwrite option', async () => {
      // Create test .github directory
      const githubDir = path.join(tempDir, '.github');
      fs.mkdirSync(githubDir, { recursive: true });
      fs.writeFileSync(path.join(githubDir, 'test.yml'), 'test: content');

      // Generate plugin first time
      const result1 = await generatePluginFromGitHubFiles({
        pluginName: 'overwrite-test',
        source: tempDir,
        context: mockContext
      });

      expect(fs.existsSync(result1.pluginPath)).toBe(true);

      // Try to generate again without overwrite (should fail)
      await expect(
        generatePluginFromGitHubFiles({
          pluginName: 'overwrite-test',
          source: tempDir,
          context: mockContext
        })
      ).rejects.toThrow('Plugin file already exists');

      // Generate with overwrite (should succeed)
      const result2 = await generatePluginFromGitHubFiles({
        pluginName: 'overwrite-test',
        source: tempDir,
        overwrite: true,
        context: mockContext
      });

      expect(fs.existsSync(result2.pluginPath)).toBe(true);
    });
  });

  describe('Function-based structure validation', () => {
    it('should generate workflow functions with correct signature', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      
      fs.mkdirSync(workflowsDir, { recursive: true });

      const testWorkflow = `name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(path.join(workflowsDir, 'test-workflow.yml'), testWorkflow);

      const result = await createPluginFromFiles({
        pluginName: 'function-test',
        githubFilesPath: githubDir,
        context: mockContext
      });

      const workflowFile = result.generatedFiles.find(f => f.type === 'workflow');
      expect(workflowFile).toBeDefined();
      
      const content = workflowFile!.content;
      
      // Check function signature
      expect(content).toContain('export async function testWorkflowHandler(');
      
      // Check stack usage
      expect(content).toContain('const { stack } = context;');
      expect(content).toContain('stack.addWorkflow(');
      expect(content).toContain("name: 'Test Workflow'");
      
      // Check imports
      expect(content).toContain('import type { GitHubWorkflow, PluginContext } from \'@dotgithub/core\'');
    });

    it('should generate resource functions with correct signature', async () => {
      const githubDir = path.join(tempDir, '.github');
      const resourcesDir = path.join(githubDir, 'resources');
      
      fs.mkdirSync(resourcesDir, { recursive: true });

      const testResource = `version: 2
updates:
  - package-ecosystem: "npm"`;

      fs.writeFileSync(path.join(resourcesDir, 'test-resource.yml'), testResource);

      const result = await createPluginFromFiles({
        pluginName: 'resource-test',
        githubFilesPath: githubDir,
        context: mockContext
      });

      const resourceFile = result.generatedFiles.find(f => f.type === 'resource');
      expect(resourceFile).toBeDefined();
      
      const content = resourceFile!.content;
      
      // Check function signature
      expect(content).toContain('export async function testResourceHandler(');
      
      // Check stack usage
      expect(content).toContain('const { stack } = context;');
      expect(content).toContain('stack.addResource(');
      expect(content).toContain('\'resources/test-resource.yml\'');
      
      // Check imports
      expect(content).toContain('import type { PluginContext } from \'@dotgithub/core\'');
    });

    it('should generate plugin index that calls functions with context', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');
      
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), 'name: CI\non: [push]');
      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), 'version: 2');

      const result = await createPluginFromFiles({
        pluginName: 'context-test',
        githubFilesPath: githubDir,
        context: mockContext
      });

      const content = result.pluginContent;
      
      // Check imports
      expect(content).toContain('import { ciHandler } from \'./workflows/ci\';');
      expect(content).toContain('import { dependabotHandler } from \'./resources/dependabot\';');
      
      // Check function calls with context
      expect(content).toContain('await ciHandler(context);');
      expect(content).toContain('await dependabotHandler(context);');
      
      // Check that no inline definitions exist
      expect(content).not.toContain('private readonly workflows: GitHubWorkflows = {');
      expect(content).not.toContain('private readonly files: Record<string, any> = {');
    });
  });

  describe('Snapshot Tests', () => {
    it('should generate consistent plugin structure with workflows and resources', async () => {
      // Create test .github directory structure
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');
      
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create test workflow file
      const testWorkflow = `name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), testWorkflow);

      // Create test resource file
      const testResource = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "team-frontend"
    assignees:
      - "maintainer1"
    commit-message:
      prefix: "chore"
      include: "scope"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"`;

      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), testResource);

      // Create another resource file
      const codeownersContent = `# Global code owners
* @team-maintainers

# Frontend code
/frontend/ @team-frontend

# Backend code
/backend/ @team-backend

# Documentation
/docs/ @team-docs`;

      fs.writeFileSync(path.join(githubDir, 'CODEOWNERS'), codeownersContent);

      const result = await createPluginFromFiles({
        pluginName: 'snapshot-test-plugin',
        githubFilesPath: githubDir,
        description: 'A comprehensive test plugin for snapshot testing',
        context: mockContext
      });

      // Test main plugin content snapshot
      expect(result.pluginContent).toMatchSnapshot('main-plugin-content');

      // Test individual file contents
      const workflowFile = result.generatedFiles.find(f => f.type === 'workflow');
      expect(workflowFile?.content).toMatchSnapshot('workflow-file-content');

      const dependabotResource = result.generatedFiles.find(f => f.name === 'dependabot');
      expect(dependabotResource?.content).toMatchSnapshot('dependabot-resource-content');

      const codeownersResource = result.generatedFiles.find(f => f.name === 'codeowners');
      expect(codeownersResource?.content).toMatchSnapshot('codeowners-resource-content');
    });

    it('should generate consistent plugin structure with only workflows', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      
      fs.mkdirSync(workflowsDir, { recursive: true });

      const releaseWorkflow = `name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Run tests
        run: npm test
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}`;

      fs.writeFileSync(path.join(workflowsDir, 'release.yml'), releaseWorkflow);

      const result = await createPluginFromFiles({
        pluginName: 'workflow-only-plugin',
        githubFilesPath: githubDir,
        description: 'Plugin with only workflow files',
        context: mockContext
      });

      expect(result.pluginContent).toMatchSnapshot('workflow-only-plugin-content');
      expect(result.generatedFiles[0]!.content).toMatchSnapshot('release-workflow-content');
    });

    it('should generate consistent plugin structure with only resources', async () => {
      const githubDir = path.join(tempDir, '.github');
      
      fs.mkdirSync(githubDir, { recursive: true });

      const issueTemplate = `---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.`;

      fs.writeFileSync(path.join(githubDir, 'ISSUE_TEMPLATE.md'), issueTemplate);

      const result = await createPluginFromFiles({
        pluginName: 'resource-only-plugin',
        githubFilesPath: githubDir,
        description: 'Plugin with only resource files',
        context: mockContext
      });

      expect(result.pluginContent).toMatchSnapshot('resource-only-plugin-content');
      expect(result.generatedFiles[0]!.content).toMatchSnapshot('issue-template-content');
    });

    it('should generate consistent plugin with complex YAML resources', async () => {
      const githubDir = path.join(tempDir, '.github');
      
      fs.mkdirSync(githubDir, { recursive: true });

      const fundingYaml = `# These are supported funding model platforms

github: # Replace with up to 4 GitHub Sponsors-enabled usernames e.g., [user1, user2, 'user3', user4]
patreon: # Replace with a single Patreon username
open_collective: # Replace with a single Open Collective name
ko_fi: # Replace with a single Ko-fi username
tidelift: # Replace with a single Tidelift platform-name/package-name e.g., npm/babel
community_bridge: # Replace with a single Community Bridge project-name e.g., cloud-foundry
liberapay: # Replace with a single Liberapay username
issuehunt: # Replace with a single IssueHunt username
otechie: # Replace with a single Otechie username
custom: # Replace with up to 4 custom sponsorship URLs e.g., ['link1', 'link2', 'link3', 'link4']`;

      fs.writeFileSync(path.join(githubDir, 'FUNDING.yml'), fundingYaml);

      const result = await createPluginFromFiles({
        pluginName: 'funding-plugin',
        githubFilesPath: githubDir,
        description: 'Plugin with funding configuration',
        context: mockContext
      });

      expect(result.pluginContent).toMatchSnapshot('funding-plugin-content');
      expect(result.generatedFiles[0]!.content).toMatchSnapshot('funding-resource-content');
    });

    it('should generate consistent plugin with special characters in names', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      
      fs.mkdirSync(workflowsDir, { recursive: true });

      const specialWorkflow = `name: Test-Workflow_With.Special@Characters
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(path.join(workflowsDir, 'test-workflow_special.yml'), specialWorkflow);

      const result = await createPluginFromFiles({
        pluginName: 'special-chars-plugin',
        githubFilesPath: githubDir,
        description: 'Plugin with special characters in workflow names',
        context: mockContext
      });

      expect(result.pluginContent).toMatchSnapshot('special-chars-plugin-content');
      expect(result.generatedFiles[0]!.content).toMatchSnapshot('special-workflow-content');
    });
  });

  describe('Index File Structure Validation (Snapshot Tests)', () => {
    it('should generate correct index file structure for complete plugin', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');
      
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create test files
      const ciWorkflow = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      const releaseWorkflow = `name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      const dependabotConfig = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"`;

      const codeownersContent = `* @team-maintainers
/frontend/ @team-frontend`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciWorkflow);
      fs.writeFileSync(path.join(workflowsDir, 'release.yml'), releaseWorkflow);
      fs.writeFileSync(path.join(resourcesDir, 'dependabot.yml'), dependabotConfig);
      fs.writeFileSync(path.join(githubDir, 'CODEOWNERS'), codeownersContent);

      const result = await createPluginFromFiles({
        pluginName: 'complete-plugin-index-test',
        githubFilesPath: githubDir,
        description: 'Complete plugin for index file snapshot testing',
        context: mockContext
      });

      // Test the complete index file structure
      expect(result.pluginContent).toMatchSnapshot('complete-plugin-index-file');
    });

    it('should generate correct index file for workflow-only plugin', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      
      fs.mkdirSync(workflowsDir, { recursive: true });

      const ciWorkflow = `name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      const releaseWorkflow = `name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciWorkflow);
      fs.writeFileSync(path.join(workflowsDir, 'release.yml'), releaseWorkflow);

      const result = await createPluginFromFiles({
        pluginName: 'workflow-only-index-test',
        githubFilesPath: githubDir,
        description: 'Workflow-only plugin for index file snapshot testing',
        context: mockContext
      });

      // Test the workflow-only index file structure
      expect(result.pluginContent).toMatchSnapshot('workflow-only-index-file');
    });

    it('should generate correct index file for resource-only plugin', async () => {
      const githubDir = path.join(tempDir, '.github');
      
      fs.mkdirSync(githubDir, { recursive: true });

      const readmeContent = `# Test Project
This is a test project.`;

      const dependabotConfig = `version: 2
updates:
  - package-ecosystem: "npm"`;

      fs.writeFileSync(path.join(githubDir, 'README.md'), readmeContent);
      fs.writeFileSync(path.join(githubDir, 'dependabot.yml'), dependabotConfig);

      const result = await createPluginFromFiles({
        pluginName: 'resource-only-index-test',
        githubFilesPath: githubDir,
        description: 'Resource-only plugin for index file snapshot testing',
        context: mockContext
      });

      // Test the resource-only index file structure
      expect(result.pluginContent).toMatchSnapshot('resource-only-index-file');
    });

    it('should generate correct index file with special characters and complex naming', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');
      
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create files with special characters to test naming
      const specialWorkflow = `name: Test-Workflow_With.Special@Characters
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

      const specialResource = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"`;

      const anotherWorkflow = `name: Another_Complex-Workflow.Name
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest`;

      fs.writeFileSync(path.join(workflowsDir, 'test-workflow_special.yml'), specialWorkflow);
      fs.writeFileSync(path.join(workflowsDir, 'another-complex_workflow.yml'), anotherWorkflow);
      fs.writeFileSync(path.join(resourcesDir, 'special-config.yml'), specialResource);

      const result = await createPluginFromFiles({
        pluginName: 'special-chars-index-test',
        githubFilesPath: githubDir,
        description: 'Plugin with special characters for index file snapshot testing',
        context: mockContext
      });

      // Test the index file with special characters
      expect(result.pluginContent).toMatchSnapshot('special-chars-index-file');
    });

    it('should generate correct index file with mixed file types', async () => {
      const githubDir = path.join(tempDir, '.github');
      const workflowsDir = path.join(githubDir, 'workflows');
      const resourcesDir = path.join(githubDir, 'resources');
      
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      // Create various file types
      const ciWorkflow = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest`;

      const issueTemplate = `---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
---

**Describe the bug**
A clear and concise description of what the bug is.`;

      const fundingYaml = `# These are supported funding model platforms
github: # Replace with up to 4 GitHub Sponsors-enabled usernames
patreon: # Replace with a single Patreon username
open_collective: # Replace with a single Open Collective name`;

      const codeownersContent = `# Global code owners
* @team-maintainers

# Frontend code
/frontend/ @team-frontend

# Backend code
/backend/ @team-backend`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciWorkflow);
      fs.writeFileSync(path.join(githubDir, 'ISSUE_TEMPLATE.md'), issueTemplate);
      fs.writeFileSync(path.join(githubDir, 'FUNDING.yml'), fundingYaml);
      fs.writeFileSync(path.join(githubDir, 'CODEOWNERS'), codeownersContent);

      const result = await createPluginFromFiles({
        pluginName: 'mixed-files-index-test',
        githubFilesPath: githubDir,
        description: 'Plugin with mixed file types for index file snapshot testing',
        context: mockContext
      });

      // Test the index file with mixed file types
      expect(result.pluginContent).toMatchSnapshot('mixed-files-index-file');
    });

    it('should generate correct relative import paths for workflow files', async () => {
      const githubDir = path.join(__dirname, '../../../test-fixtures/.github');
      
      // Create a mock context with actions config
      const mockContext = {
        config: {
          version: '1.0.0',
          outputDir: 'src',
          actions: [
            {
              orgRepo: 'actions/checkout',
              ref: 'test-ref',
              versionRef: 'v4',
              functionName: 'checkout',
              outputPath: 'actions/actions/checkout.ts'
            },
            {
              orgRepo: 'actions/setup-node',
              ref: 'test-ref',
              versionRef: 'v4',
              functionName: 'setupNodeJsEnvironment',
              outputPath: 'actions/actions/setup-node.ts'
            }
          ],
          plugins: [],
          stacks: [],
          options: {
            tokenSource: 'env',
            formatting: { prettier: true }
          }
        },
        configPath: '',
        outputPath: '',
        relativePath: (p: string) => p,
        resolvePath: (p: string) => p
      } as unknown as DotGithubContext;

      const result = await createPluginFromFiles({
        pluginName: 'test-plugin',
        githubFilesPath: githubDir,
        context: mockContext,
        outputDir: 'src'
      });

      
      // Find the workflow file content (looking for test.ts since the fixture has test.yml)
      const workflowFile = result.generatedFiles.find(f => f.path.endsWith('workflows/test.ts'));
      expect(workflowFile).toBeDefined();
      expect(workflowFile!.content).toBeDefined();

      const workflowContent = workflowFile!.content!;

      // Verify that imports use the correct relative path (../../../)
      expect(workflowContent).toContain("import { checkout } from '../../../actions/actions/checkout.js';");
      expect(workflowContent).toContain("import { setupNodeJsEnvironment } from '../../../actions/actions/setup-node.js';");
      
      // Verify that the paths go up three levels to reach src/ from plugins/plugin-name/workflows/
      expect(workflowContent).toMatch(/import.*from '\.\.\/\.\.\/\.\.\/actions\//);
      
      // Verify no incorrect paths (only two levels up)
      expect(workflowContent).not.toMatch(/import.*from '\.\.\/\.\.\/actions\//);
    });
  });
});
