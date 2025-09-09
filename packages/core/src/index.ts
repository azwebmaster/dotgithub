export function helloCore(): string {
  return 'Hello from @dotgithub/core!';
}

// Export types and functions that will be used by generated code
export { createStep } from './actions';
export type { GitHubStep, GitHubStepBase, GitHubWorkflow, GitHubJob, GitHubWorkflows } from './types/workflow';

// Export construct classes for CDK-style workflow building
export * from './constructs';

// Export GH class and types
export { GH } from './GH';
export type { DotGitHubResource, DotGitHub } from './types/common';

// Export workflow generation functions
export { generateWorkflowYaml, createWorkflow, createJob } from './workflow-generator';
export type { WorkflowGenerationOptions } from './workflow-generator';

// Export configuration functionality
export {
  readConfig,
  writeConfig,
  addActionToConfig,
  removeActionFromConfig,
  getActionsFromConfig,
  getActionsFromConfigWithResolvedPaths,
  getResolvedOutputPath,
  updateOutputDir,
  getConfigPath,
  setConfigPath,
  createDefaultConfig,
  createConfigFile,
  getPluginsFromConfig,
  getStacksFromConfig,
  addPluginToConfig,
  removePluginFromConfig,
  addStackToConfig,
  removeStackFromConfig
} from './config';
export type {
  DotGithubConfig,
  DotGithubAction
} from './config';

// Export plugin system
export * from './plugins';
export { StackSynthesizer } from './stack-synthesizer';
export type { StackSynthesizerOptions, SynthesisResult, SynthesisResults } from './stack-synthesizer';

// Export plugin generator
export { 
  generatePluginFromGithubFiles, 
  createPluginFromFiles 
} from './plugin-generator';
export type { 
  GeneratePluginFromGithubFilesOptions, 
  GeneratePluginFromGithubFilesResult,
  CreatePluginFromFilesOptions,
  CreatePluginFromFilesResult
} from './plugin-generator';

// Export action management functionality
export {
  generateActionFiles,
  removeActionFiles,
  updateActionFiles
} from './actions-manager';
export type {
  GenerateActionFilesOptions,
  GenerateActionFilesResult,
  RemoveActionFilesOptions,
  RemoveActionFilesResult,
  UpdateActionFilesOptions,
  UpdateActionFilesResult,
  UpdatedAction,
  UpdateError
} from './actions-manager';

// Export type generation functionality
export {
  generateTypesFromActionYml
} from './types-generator';
export type {
  GenerateTypesResult
} from './types-generator';

