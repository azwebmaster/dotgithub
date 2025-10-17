import { GitHubOutputValue, ActionConstruct } from '@dotgithub/core';
import type {
  GitHubInputValue,
  ActionConstructProps,
  Construct,
} from '@dotgithub/core';

/** Input parameters for the Setup Python action */
export type SetupPythonInputs = {
  /** Version range or exact version of Python or PyPy to use, using SemVer's version range syntax. Reads from .python-version if unset. */
  'python-version'?: GitHubInputValue;
  /** File containing the Python version to use. Example: .python-version */
  'python-version-file'?: GitHubInputValue;
  /** Used to specify a package manager for caching in the default directory. Supported values: pip, pipenv, poetry. */
  cache?: GitHubInputValue;
  /** The target architecture (x86, x64, arm64) of the Python or PyPy interpreter. */
  architecture?: GitHubInputValue;
  /** Set this option if you want the action to check for the latest available version that satisfies the version spec. | default: false */
  'check-latest'?: GitHubInputValue;
  /** The token used to authenticate when fetching Python distributions from https://github.com/actions/python-versions. When running this action on github.com, the default value is sufficient. When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting. | default: "${{ github.server_url == 'https://github.com' && github.token || '' }}" */
  token?: GitHubInputValue;
  /** Used to specify the path to dependency files. Supports wildcards or a list of file names for caching multiple dependencies. */
  'cache-dependency-path'?: GitHubInputValue;
  /** Set this option if you want the action to update environment variables. | default: true */
  'update-environment'?: GitHubInputValue;
  /** When 'true', a version range passed to 'python-version' input will match prerelease versions if no GA versions are found. Only 'x.y' version range is supported for CPython. | default: false */
  'allow-prereleases'?: GitHubInputValue;
  /** When 'true', use the freethreaded version of Python. | default: false */
  freethreaded?: GitHubInputValue;
  /** Used to specify the version of pip to install with the Python. Supported format: major[.minor][.patch]. */
  'pip-version'?: GitHubInputValue;
};

export const SetupPythonOutputs = {
  /** The installed Python or PyPy version. Useful when given a version range as input. */
  'python-version': new GitHubOutputValue('python-version'),
  /** A boolean value to indicate a cache entry was found */
  'cache-hit': new GitHubOutputValue('cache-hit'),
  /** The absolute path to the Python or PyPy executable. */
  'python-path': new GitHubOutputValue('python-path'),
};

export type SetupPythonOutputsType = typeof SetupPythonOutputs;

/**
 * Set up a specific version of Python and add the command-line tools to the PATH.
 *
 * @see {@link https://github.com/actions/setup-python/tree/v6} - GitHub repository and documentation
 */
export class SetupPython extends ActionConstruct<
  SetupPythonInputs,
  SetupPythonOutputsType
> {
  protected readonly uses = 'actions/setup-python';
  protected readonly fallbackRef = 'e797f83bcb11b83ae66e0230d6156d7c80228e7c';
  protected readonly outputs = SetupPythonOutputs;

  constructor(
    scope: Construct | undefined,
    id: string,
    props: ActionConstructProps<SetupPythonInputs>
  ) {
    super(scope, id, props);
  }
}
