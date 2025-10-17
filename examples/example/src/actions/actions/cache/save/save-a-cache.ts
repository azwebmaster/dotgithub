import { ActionConstruct } from '@dotgithub/core';
import type {
  GitHubInputValue,
  ActionConstructProps,
  Construct,
} from '@dotgithub/core';

/** Input parameters for the Save a cache action */
export type SaveACacheSaveInputs = {
  /** A list of files, directories, and wildcard patterns to cache */
  path: GitHubInputValue;
  /** An explicit key for saving the cache */
  key: GitHubInputValue;
  /** The chunk size used to split up large files during upload, in bytes */
  'upload-chunk-size'?: GitHubInputValue;
  /** An optional boolean when enabled, allows windows runners to save caches that can be restored on other platforms | default: "false" */
  enableCrossOsArchive?: GitHubInputValue;
};

export const SaveACacheSaveOutputs = {};

export type SaveACacheSaveOutputsType = typeof SaveACacheSaveOutputs;

/**
 * Save Cache artifacts like dependencies and build outputs to improve workflow execution time
 *
 * @see {@link https://github.com/actions/cache/save/tree/v4} - GitHub repository and documentation
 */
export class SaveACacheSave extends ActionConstruct<
  SaveACacheSaveInputs,
  SaveACacheSaveOutputsType
> {
  protected readonly uses = 'actions/cache/save';
  protected readonly fallbackRef = '0057852bfaa89a56745cba8c7296529d2fc39830';
  protected readonly outputs = SaveACacheSaveOutputs;

  constructor(
    scope: Construct | undefined,
    id: string,
    props: ActionConstructProps<SaveACacheSaveInputs>
  ) {
    super(scope, id, props);
  }
}
