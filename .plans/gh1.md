# GH class with static methods

This class will be a helper class with static methods located in core.

## Resource Methods

- `GH.resource('<file1>')` which will read file1 and return a DotGitHubResource
- `GH.resources('./dir1/', '**/*.yml', './targetDir/')` which will read all files in dir1 using glob `**/*.yml` and create nested DotGitHubResource objects with the name using `./targetDir/<relative-glob-path>` (default target path using the dir1 path).
