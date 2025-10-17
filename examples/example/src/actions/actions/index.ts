import { ActionsConstruct } from '@dotgithub/core';
import type { Construct, GitHubStepAction } from '@dotgithub/core';

import {
  Cache as Cache,
  type CacheInputs as CacheInputs,
} from './cache/cache.js';
import {
  RestoreCacheRestore as RestoreCacheRestore,
  type RestoreCacheRestoreInputs as RestoreCacheRestoreInputs,
} from './cache/restore/restore-cache.js';
import {
  SaveACacheSave as SaveACacheSave,
  type SaveACacheSaveInputs as SaveACacheSaveInputs,
} from './cache/save/save-a-cache.js';
import {
  Checkout as Checkout,
  type CheckoutInputs as CheckoutInputs,
} from './checkout.js';
import {
  DownloadABuildArtifact as DownloadABuildArtifact,
  type DownloadABuildArtifactInputs as DownloadABuildArtifactInputs,
} from './download-artifact.js';
import {
  SetupNode as SetupNode,
  type SetupNodeInputs as SetupNodeInputs,
} from './setup-node.js';
import {
  SetupPython as SetupPython,
  type SetupPythonInputs as SetupPythonInputs,
} from './setup-python.js';
import {
  UploadABuildArtifact as UploadABuildArtifact,
  type UploadABuildArtifactInputs as UploadABuildArtifactInputs,
} from './upload-artifact/upload-a-build-artifact.js';
import {
  MergeBuildArtifactsMerge as MergeBuildArtifactsMerge,
  type MergeBuildArtifactsMergeInputs as MergeBuildArtifactsMergeInputs,
} from './upload-artifact/merge/merge-build-artifacts.js';

/**
 * Actions organization actions.
 * Provides convenient access to all actions from the actions organization.
 *
 * Usage:
 * ```typescript
 * const actions = new Actions(stack, "actions");
 * const checkoutStep = actions.checkout("Checkout code", { inputs: {...} }).toStep();
 * ```
 */
export class Actions extends ActionsConstruct {
  constructor(scope: Construct | undefined, id: string) {
    super(scope, id);
  }

  /**
   * Cache artifacts like dependencies and build outputs to improve workflow execution time
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A Cache instance
   */
  public cache = (
    name: string,
    inputs?: CacheInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): Cache => {
    return this.createActionConstruct(Cache, 'Cache', {
      inputs,
      stepOptions: { name, ...stepOptions },
      ref,
    });
  };

  /**
   * Restore Cache artifacts like dependencies and build outputs to improve workflow execution time
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A RestoreCacheRestore instance
   */
  public restoreCache = (
    name: string,
    inputs?: RestoreCacheRestoreInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): RestoreCacheRestore => {
    return this.createActionConstruct(
      RestoreCacheRestore,
      'RestoreCacheRestore',
      { inputs, stepOptions: { name, ...stepOptions }, ref }
    );
  };

  /**
   * Save Cache artifacts like dependencies and build outputs to improve workflow execution time
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A SaveACacheSave instance
   */
  public saveACache = (
    name: string,
    inputs?: SaveACacheSaveInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): SaveACacheSave => {
    return this.createActionConstruct(SaveACacheSave, 'SaveACacheSave', {
      inputs,
      stepOptions: { name, ...stepOptions },
      ref,
    });
  };

  /**
   * Checkout a Git repository at a particular version
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A Checkout instance
   */
  public checkout = (
    name: string,
    inputs?: CheckoutInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): Checkout => {
    return this.createActionConstruct(Checkout, 'Checkout', {
      inputs,
      stepOptions: { name, ...stepOptions },
      ref,
    });
  };

  /**
   * Download a build artifact that was previously uploaded in the workflow by the upload-artifact action
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A DownloadABuildArtifact instance
   */
  public downloadABuildArtifact = (
    name: string,
    inputs?: DownloadABuildArtifactInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): DownloadABuildArtifact => {
    return this.createActionConstruct(
      DownloadABuildArtifact,
      'DownloadABuildArtifact',
      { inputs, stepOptions: { name, ...stepOptions }, ref }
    );
  };

  /**
   * Setup a Node.js environment by adding problem matchers and optionally downloading and adding it to the PATH.
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A SetupNode instance
   */
  public setupNode = (
    name: string,
    inputs?: SetupNodeInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): SetupNode => {
    return this.createActionConstruct(SetupNode, 'SetupNode', {
      inputs,
      stepOptions: { name, ...stepOptions },
      ref,
    });
  };

  /**
   * Set up a specific version of Python and add the command-line tools to the PATH.
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A SetupPython instance
   */
  public setupPython = (
    name: string,
    inputs?: SetupPythonInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): SetupPython => {
    return this.createActionConstruct(SetupPython, 'SetupPython', {
      inputs,
      stepOptions: { name, ...stepOptions },
      ref,
    });
  };

  /**
   * Upload a build artifact that can be used by subsequent workflow steps
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A UploadABuildArtifact instance
   */
  public uploadABuildArtifact = (
    name: string,
    inputs?: UploadABuildArtifactInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): UploadABuildArtifact => {
    return this.createActionConstruct(
      UploadABuildArtifact,
      'UploadABuildArtifact',
      { inputs, stepOptions: { name, ...stepOptions }, ref }
    );
  };

  /**
   * Merge one or more build Artifacts
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A MergeBuildArtifactsMerge instance
   */
  public mergeBuildArtifacts = (
    name: string,
    inputs?: MergeBuildArtifactsMergeInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, 'uses' | 'with' | 'name'>>,
    ref?: string
  ): MergeBuildArtifactsMerge => {
    return this.createActionConstruct(
      MergeBuildArtifactsMerge,
      'MergeBuildArtifactsMerge',
      { inputs, stepOptions: { name, ...stepOptions }, ref }
    );
  };
}
