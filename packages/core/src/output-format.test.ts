import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateActionFiles, createDefaultConfig } from './index';
import { DotGithubContext } from './context';

vi.mock('./github');
vi.mock('./git');

describe('generateActionFiles output format', () => {
  let tmpDir: string;
  
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-format-'));
  });
  
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate output matching the expected format from the issue', async () => {
    const { getDefaultBranch } = await import('./github');
    const { cloneRepo } = await import('./git');
    
    vi.mocked(getDefaultBranch).mockResolvedValue('v4');
    vi.mocked(cloneRepo).mockImplementation(async (url: string, tmpDir: string) => {
      // Use the exact example from the issue
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

    const config = createDefaultConfig();
    const configPath = path.join(tmpDir, 'dotgithub.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    const context = new DotGithubContext({ 
      config, 
      configPath 
    });
    
    const result = await generateActionFiles(context, {
      orgRepoRef: 'actions/my-action@v4',
      outputDir: tmpDir
    });

    const generatedContent = fs.readFileSync(result.filePath, 'utf8');

    // Verify structure matches the expected format from the issue
    expect(generatedContent).toContain('import { createStep } from "@dotgithub/core";');
    expect(generatedContent).toContain('GitHubStep');
    expect(generatedContent).toContain('GitHubStepBase');
    expect(generatedContent).toContain('GitHubActionInputValue');
    expect(generatedContent).toContain('export type MyActionInputs = {');
    expect(generatedContent).toContain('/** Property 1 */\n  prop1: GitHubActionInputValue;');
    expect(generatedContent).toContain('/** Property 2 | default: "p2" */\n  "prop-2"?: GitHubActionInputValue;');
    expect(generatedContent).toContain('export type MyActionOutputs = {');
    expect(generatedContent).toContain('/** Output 1 */\n  output1: string;');
    expect(generatedContent).toContain('Action description');
    expect(generatedContent).toContain('https://github.com/actions/my-action/tree/v4');
    expect(generatedContent).toContain('export function myAction(');
    expect(generatedContent).toContain('return createStep(');
    expect(generatedContent).toContain('"actions/my-action",');
    expect(generatedContent).toContain('{ ...step, with: inputs }');
  });
});