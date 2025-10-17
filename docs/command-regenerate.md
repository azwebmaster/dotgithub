# dotgithub regenerate

Regenerate TypeScript files based on the config.

## Synopsis

```bash
dotgithub regenerate [pattern] [options]
```

## Description

The `regenerate` command recreates TypeScript files for tracked GitHub Actions based on your current configuration. This is useful when you need to refresh generated files, apply formatting changes, or recover from file corruption.

## Arguments

- `[pattern]` - Optional glob pattern to filter actions (e.g., `"actions/*"` or `"*/checkout"`)

## Options

- `-t, --token <token>` - GitHub token (overrides env GITHUB_TOKEN)
- `--prune` - Remove orphaned files not defined in config

## Examples

### Regenerate all actions

```bash
dotgithub regenerate
```

Regenerates TypeScript files for all tracked actions.

### Regenerate specific actions

```bash
dotgithub regenerate "actions/*"
```

Regenerates only actions from the `actions` organization.

### Regenerate with pruning

```bash
dotgithub regenerate --prune
```

Regenerates all actions and removes orphaned files not in the configuration.

### Regenerate with custom token

```bash
dotgithub regenerate -t ghp_xxxxxxxxxxxx
```

Uses a specific GitHub token for regeneration.

## How it works

1. **Reads configuration** - Loads actions from `dotgithub.json`
2. **Filters actions** - Applies pattern filter if specified
3. **Downloads metadata** - Fetches action.yml files from GitHub
4. **Generates TypeScript** - Creates type-safe wrapper classes
5. **Formats code** - Applies Prettier formatting
6. **Updates index files** - Regenerates organization and root index files
7. **Cleans up** - Removes orphaned files if `--prune` is used

## Pattern matching

The pattern argument uses glob syntax to filter actions:

- `"actions/*"` - All actions from the `actions` organization
- `"*/checkout"` - All checkout actions from any organization
- `"actions/setup-*"` - All setup actions from the `actions` organization
- `"*"` - All actions (same as no pattern)

## File regeneration

For each action, the command:

1. **Downloads action.yml** - Fetches the latest action definition
2. **Generates types** - Creates TypeScript interfaces for inputs/outputs
3. **Creates wrapper class** - Generates ActionConstruct subclass
4. **Adds imports** - Includes necessary DotGitHub imports
5. **Formats code** - Applies consistent formatting with Prettier
6. **Writes file** - Saves to the configured output path

## Index file regeneration

The command also regenerates:

- **Organization index files** - `actions/orgName/index.ts`
- **Root index file** - `actions/index.ts`
- **Action construct classes** - Aggregated action classes

## Pruning orphaned files

When using `--prune`, the command:

1. **Identifies expected files** - Based on configuration
2. **Scans output directory** - Finds all TypeScript files
3. **Removes orphaned files** - Deletes files not in configuration
4. **Cleans empty directories** - Removes empty organization directories

## Output information

The command provides detailed progress information:

```
Regenerating 3 action(s)...
Regenerating actions/checkout...
  ✓ Generated src/actions/actions/checkout.ts
Regenerating actions/setup-node...
  ✓ Generated src/actions/actions/setup-node.ts
Regenerating actions/setup-python...
  ✓ Generated src/actions/actions/setup-python.ts
  ✓ Regenerated org index for actions
Successfully regenerated 3 action(s)
```

## When to use

Use this command to:

- **Recover from corruption** - Fix corrupted or missing files
- **Apply formatting** - Update code formatting standards
- **Refresh types** - Get latest type definitions
- **Clean up project** - Remove unused files with `--prune`
- **Debug issues** - Regenerate files to resolve problems
- **Update after config changes** - Apply configuration modifications

## Error handling

The command handles various error scenarios:

### Partial failures

```
Regenerating actions/checkout...
  ✓ Generated src/actions/actions/checkout.ts
Regenerating actions/invalid-action...
  ✗ Failed to regenerate actions/invalid-action: Repository not found
```

### No actions found

```
No actions found in config file
```

### Pattern mismatch

```
No actions match pattern "invalid-pattern"
```

## Authentication

Requires GitHub token for:

- Accessing private repositories
- Higher rate limits
- Downloading action metadata

Set via:

- Environment variable: `GITHUB_TOKEN`
- Command option: `--token <token>`

## Performance considerations

Regeneration performance depends on:

- Number of actions to regenerate
- Network speed for downloading metadata
- File I/O operations
- Code formatting with Prettier

Use patterns to regenerate only specific actions for faster iteration.

## Best practices

1. **Use patterns for efficiency** - Regenerate only what you need
2. **Regular pruning** - Use `--prune` periodically to clean up
3. **Version control** - Commit regenerated files
4. **Test after regeneration** - Verify everything still works
5. **Backup before pruning** - Be careful with `--prune` on important projects

## Related commands

- [dotgithub add](command-add.md) - Add new actions
- [dotgithub update](command-update.md) - Update action versions
- [dotgithub remove](command-remove.md) - Remove actions
- [dotgithub list](command-list.md) - See tracked actions

## See also

- [dotgithub add](command-add.md) - Add GitHub Actions to your project
- [dotgithub update](command-update.md) - Update action versions
- [dotgithub remove](command-remove.md) - Remove actions from tracking
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
