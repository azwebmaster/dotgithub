# dotgithub update

Update GitHub Actions to latest versions or use versionRef.

## Synopsis

```bash
dotgithub update [orgRepoRef] [options]
```

## Description

The `update` command updates tracked GitHub Actions to newer versions. You can update all actions at once or specify a particular action to update. The command resolves version references to specific commit SHAs for reproducibility.

## Arguments

- `[orgRepoRef]` - GitHub repository reference (e.g., `actions/checkout`). If not provided, updates all actions

## Options

- `--output <outputDir>` - Output directory for generated TypeScript files (uses config default if not specified)
- `-t, --token <token>` - GitHub token (overrides env GITHUB_TOKEN)
- `--latest` - Use the latest git tag with semver parsing instead of versionRef
- `--no-sha` - Use the original ref instead of resolving to SHA

## Examples

### Update all actions

```bash
dotgithub update
```

Updates all tracked actions to their latest versions based on their versionRef.

### Update specific action

```bash
dotgithub update actions/checkout
```

Updates only the checkout action to its latest version.

### Update to latest available version

```bash
dotgithub update actions/checkout --latest
```

Updates to the latest available version, ignoring the stored versionRef.

### Update without SHA resolution

```bash
dotgithub update actions/checkout --no-sha
```

Updates the version reference but doesn't resolve to a specific commit SHA.

### Update with custom output directory

```bash
dotgithub update --output ./custom-actions
```

Updates actions and outputs to a custom directory.

## How it works

1. **Identifies actions** - Finds actions to update (all or specific)
2. **Resolves versions** - Determines the latest version based on versionRef or --latest
3. **Downloads metadata** - Fetches updated action.yml files
4. **Regenerates files** - Creates new TypeScript files with updated types
5. **Updates configuration** - Saves new version references and SHAs

## Version resolution

The command uses different strategies for version resolution:

### Using versionRef (default)

- Follows the stored versionRef pattern (e.g., `v4` → `v4.1.2`)
- Maintains semantic versioning compatibility
- Preserves major version boundaries

### Using --latest

- Finds the absolute latest version available
- Ignores versionRef constraints
- May include breaking changes

## Update strategies

### Conservative updates

```bash
dotgithub update
```

- Updates within versionRef constraints
- Maintains compatibility
- Safe for production use

### Aggressive updates

```bash
dotgithub update --latest
```

- Updates to absolute latest
- May include breaking changes
- Requires testing

### Selective updates

```bash
dotgithub update actions/checkout
```

- Updates only specific actions
- Allows gradual migration
- Reduces risk

## Output information

The command shows detailed update information:

```
✅ Successfully updated 2 action(s):
  actions/checkout: v4.1.0 → v4.1.1
    Generated: src/actions/actions/checkout.ts
  actions/setup-node: v4.0.0 → v4.1.0
    Generated: src/actions/actions/setup-node.ts
```

## Error handling

The command handles various error scenarios:

### Partial failures

If some actions fail to update:

```
✅ Successfully updated 1 action(s):
  actions/checkout: v4.1.0 → v4.1.1

❌ Failed to update 1 action(s):
  actions/invalid-action: Repository not found
```

### No updates needed

```
No actions needed updating.
```

## Authentication

Requires GitHub token for:

- Accessing private repositories
- Higher rate limits
- Resolving version references

Set via:

- Environment variable: `GITHUB_TOKEN`
- Command option: `--token <token>`

## Best practices

1. **Test after updates** - Verify workflows still work
2. **Update incrementally** - Update one action at a time for major changes
3. **Use version control** - Commit changes after successful updates
4. **Monitor breaking changes** - Check action changelogs for breaking changes
5. **Backup before major updates** - Use `--latest` carefully

## When to use

Use this command to:

- **Security updates** - Get latest security patches
- **Bug fixes** - Receive bug fixes and improvements
- **Feature updates** - Access new functionality
- **Maintenance** - Keep dependencies current
- **Compatibility** - Update for new GitHub Actions features

## Related commands

- [dotgithub list](command-list.md) - See current versions
- [dotgithub add](command-add.md) - Add new actions
- [dotgithub remove](command-remove.md) - Remove outdated actions
- [dotgithub regenerate](command-regenerate.md) - Regenerate without updating

## See also

- [dotgithub add](command-add.md) - Add GitHub Actions to your project
- [dotgithub list](command-list.md) - List tracked actions
- [dotgithub remove](command-remove.md) - Remove actions from tracking
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
