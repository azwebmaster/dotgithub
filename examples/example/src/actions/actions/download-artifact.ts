import { GitHubOutputValue, ActionConstruct } from '@dotgithub/core';
import type {
  GitHubInputValue,
  ActionConstructProps,
  Construct,
} from '@dotgithub/core';

/** Input parameters for the Download a Build Artifact action */
export type DownloadABuildArtifactInputs = {
  /** Name of the artifact to download. If unspecified, all artifacts for the run are downloaded. */
  name?: GitHubInputValue;
  /** IDs of the artifacts to download, comma-separated. Either inputs `artifact-ids` or `name` can be used, but not both. */
  'artifact-ids'?: GitHubInputValue;
  /** Destination path. Supports basic tilde expansion. Defaults to $GITHUB_WORKSPACE */
  path?: GitHubInputValue;
  /** A glob pattern matching the artifacts that should be downloaded. Ignored if name is specified. */
  pattern?: GitHubInputValue;
  /** When multiple artifacts are matched, this changes the behavior of the destination directories. If true, the downloaded artifacts will be in the same directory specified by path. If false, the downloaded artifacts will be extracted into individual named directories within the specified path. | default: "false" */
  'merge-multiple'?: GitHubInputValue;
  /** The GitHub token used to authenticate with the GitHub API. This is required when downloading artifacts from a different repository or from a different workflow run. If this is not specified, the action will attempt to download artifacts from the current repository and the current workflow run. */
  'github-token'?: GitHubInputValue;
  /** The repository owner and the repository name joined together by "/". If github-token is specified, this is the repository that artifacts will be downloaded from. | default: "${{ github.repository }}" */
  repository?: GitHubInputValue;
  /** The id of the workflow run where the desired download artifact was uploaded from. If github-token is specified, this is the run that artifacts will be downloaded from. | default: "${{ github.run_id }}" */
  'run-id'?: GitHubInputValue;
};

export const DownloadABuildArtifactOutputs = {
  /** Path of artifact download */
  'download-path': new GitHubOutputValue('download-path'),
};

export type DownloadABuildArtifactOutputsType =
  typeof DownloadABuildArtifactOutputs;

/**
 * Download a build artifact that was previously uploaded in the workflow by the upload-artifact action
 *
 * @see {@link https://github.com/actions/download-artifact/tree/v5} - GitHub repository and documentation
 */
export class DownloadABuildArtifact extends ActionConstruct<
  DownloadABuildArtifactInputs,
  DownloadABuildArtifactOutputsType
> {
  protected readonly uses = 'actions/download-artifact';
  protected readonly fallbackRef = '634f93cb2916e3fdff6788551b99b062d0335ce0';
  protected readonly outputs = DownloadABuildArtifactOutputs;

  constructor(
    scope: Construct | undefined,
    id: string,
    props: ActionConstructProps<DownloadABuildArtifactInputs>
  ) {
    super(scope, id, props);
  }
}
