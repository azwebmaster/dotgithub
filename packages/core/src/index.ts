export function helloCore(): string {
  return 'Hello from @dotgithub/core!';
}

// Export types and functions that will be used by generated code
export { createStep } from './actions.js';
export type { GitHubStep, GitHubStepBase, GitHubWorkflow, GitHubJob, GitHubWorkflows } from './types/workflow.js';

// Export construct classes for CDK-style workflow building
export * from './constructs/index.js';

// Export GH class and types
export { GH } from './GH.js';
export type { DotGitHubResource, DotGitHub, GitHubActionInputValue } from './types/common.js';

// Export workflow generation functions
export { generateWorkflowYaml, createWorkflow, createJob } from './workflow-generator.js';
export type { WorkflowGenerationOptions } from './workflow-generator.js';

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
  removeStackFromConfig,
  // Path resolution utilities
  getProjectRoot,
  getConfigDir,
  getOutputDir,
  makeRelativeToConfig,
  makeRelativeToOutput,
  resolveFromOutput,
  resolvePathFromConfig
} from './config.js';
export type {
  DotGithubConfig,
  DotGithubAction
} from './config.js';

// Export context functionality
export * from './context.js';

// Export plugin system
export * from './plugins/index.js';
export { StackSynthesizer } from './stack-synthesizer.js';
export type { StackSynthesizerOptions, SynthesisResult, SynthesisResults } from './stack-synthesizer.js';

// Export plugin generator
export { 
  generatePluginFromGithubFiles, 
  createPluginFromFiles 
} from './plugin-generator.js';
export type { 
  GeneratePluginFromGithubFilesOptions, 
  GeneratePluginFromGithubFilesResult,
  CreatePluginFromFilesOptions,
  CreatePluginFromFilesResult
} from './plugin-generator.js';

// Export action management functionality
export {
  generateActionFiles,
  removeActionFiles,
  updateActionFiles
} from './actions-manager.js';
export type {
  GenerateActionFilesOptions,
  GenerateActionFilesResult,
  RemoveActionFilesOptions,
  RemoveActionFilesResult,
  UpdateActionFilesOptions,
  UpdateActionFilesResult,
  UpdatedAction,
  UpdateError
} from './actions-manager.js';

// Export type generation functionality
export {
  generateTypesFromActionYml
} from './types-generator.js';
export type {
  GenerateTypesResult
} from './types-generator.js';

