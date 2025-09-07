import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateActionFiles } from './index';

// Mock the GitHub API and git cloning
vi.mock('./github');
vi.mock('./git');

describe('generateActionFiles integration', () => {
  let tmpDir: string;
  
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-action-files-'));
  });
  
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate TypeScript file and update index.ts', async () => {
    // Mock the dependencies
    const { getDefaultBranch } = await import('./github');
    const { cloneRepo } = await import('./git');
    
    vi.mocked(getDefaultBranch).mockResolvedValue('main');
    vi.mocked(cloneRepo).mockImplementation(async (url: string, tmpDir: string) => {
      // Create a mock action.yml file in the temp directory
      const actionYml = `name: 'MyAction'
description: 'Action description'
inputs:
  prop1:
    description: Property 1
    required: true
  prop-2:
    description: Property 2
    default: p2

outputs:
  output1:
    description: 'Output 1'
runs:
  using: node24
  main: dist/index.js
  post: dist/index.js`;
      
      fs.writeFileSync(path.join(tmpDir, 'action.yml'), actionYml);
    });

    const result = await generateActionFiles({
      orgRepoRef: 'actions/my-action@v4',
      outputDir: tmpDir
    });

    expect(result.actionName).toBe('myaction');
    expect(result.filePath).toBe(path.join(tmpDir, 'actions', 'myaction.ts'));
    
    // Check that the TypeScript file was generated
    expect(fs.existsSync(result.filePath)).toBe(true);
    
    const generatedContent = fs.readFileSync(result.filePath, 'utf8');
    expect(generatedContent).toContain('import { createStep } from "@dotgithub/core";');
    expect(generatedContent).toContain('import type { GitHubStep, GitHubStepBase } from "@dotgithub/core";');
    expect(generatedContent).toContain('export type MyActionInputs');
    expect(generatedContent).toContain('export type MyActionOutputs');
    expect(generatedContent).toContain('export function myAction');
    expect(generatedContent).toContain('Property 1');
    expect(generatedContent).toContain('Property 2');
    expect(generatedContent).toContain('default: "p2"');
    
    // Check that root index.ts was created with organization export
    const rootIndexPath = path.join(tmpDir, 'index.ts');
    expect(fs.existsSync(rootIndexPath)).toBe(true);
    
    const rootIndexContent = fs.readFileSync(rootIndexPath, 'utf8');
    expect(rootIndexContent).toContain('export * as actions from "./actions/index.js";');
    
    // Check that organization index.ts was created
    const orgIndexPath = path.join(tmpDir, 'actions', 'index.ts');
    expect(fs.existsSync(orgIndexPath)).toBe(true);
    
    const orgIndexContent = fs.readFileSync(orgIndexPath, 'utf8');
    expect(orgIndexContent).toContain('export * from "./myaction.js";');
  });

  it('should not duplicate exports in index.ts when called multiple times', async () => {
    const { getDefaultBranch } = await import('./github');
    const { cloneRepo } = await import('./git');
    
    vi.mocked(getDefaultBranch).mockResolvedValue('main');
    vi.mocked(cloneRepo).mockImplementation(async (url: string, tmpDir: string) => {
      const actionYml = `name: 'TestAction'
description: 'Test action'
runs:
  using: node24
  main: dist/index.js`;
      fs.writeFileSync(path.join(tmpDir, 'action.yml'), actionYml);
    });

    // Generate the same action twice
    await generateActionFiles({
      orgRepoRef: 'actions/test-action@v1',
      outputDir: tmpDir
    });
    
    await generateActionFiles({
      orgRepoRef: 'actions/test-action@v1',
      outputDir: tmpDir
    });

    const orgIndexContent = fs.readFileSync(path.join(tmpDir, 'actions', 'index.ts'), 'utf8');
    const exportLines = orgIndexContent.split('\n').filter(line => line.includes('testaction.js'));
    expect(exportLines).toHaveLength(1);
  });
});