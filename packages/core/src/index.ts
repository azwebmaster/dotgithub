

// Export types and functions that will be used by generated code
export { createStep, run } from './actions.js';
export type { GitHubStep, GitHubStepBase, GitHubStepAction, GitHubStepWith, GitHubWorkflow, GitHubJob, GitHubWorkflows } from './types/workflow.js';

// Export construct classes for CDK-style workflow building
export * from './constructs/index.js';

// Export GH class and types
export { GH } from './GH.js';
export type { DotGitHubResource, DotGitHub, GitHubInputValue } from './types/common.js';

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
  updateRootDir,
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
  getConfigDir,
  // OutputPath validation and fixing
  validateAndFixOutputPaths
} from './config.js';
export type {
  DotGithubConfig,
  DotGithubAction
} from './config.js';

// Export context functionality
export * from './context.js';

// Export plugin system
export * from './plugins/index.js';
export { ActionCollection } from './plugins/action-collection.js';
export { StepChainBuilder } from './plugins/actions-helper.js';
export { StackSynthesizer } from './stack-synthesizer.js';
export type { StackSynthesizerOptions, SynthesisResult, SynthesisResults } from './stack-synthesizer.js';

// Export plugin generator
export { 
  generatePluginFromGitHubFiles, 
  createPluginFromFiles 
} from './plugin-generator.js';
export type { 
  GeneratePluginFromGitHubFilesOptions, 
  GeneratePluginFromGitHubFilesResult,
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

