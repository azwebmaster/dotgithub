# dotgithub remove

Remove a GitHub Action from tracking and delete generated files.

## Synopsis

```bash
dotgithub remove <orgRepoRef> [options]
dotgithub rm <orgRepoRef> [options]
```

## Description

The `remove` command removes a GitHub Action from your project's tracking and optionally deletes the generated TypeScript files. This is useful for cleaning up unused actions or removing actions that are no longer needed.

## Arguments

- `<orgRepoRef>` - GitHub repository reference (e.g., `actions/checkout@v4` or `actions/checkout`)

## Options

- `--keep-files` - Remove from tracking but keep generated files

## Examples

### Remove an action completely

```bash
dotgithub remove actions/checkout@v4
```

This removes the action from tracking and deletes all generated files.

### Remove from tracking only

```bash
dotgithub remove actions/checkout@v4 --keep-files
```

This removes the action from tracking but keeps the generated TypeScript files.

### Using the alias

```bash
dotgithub rm actions/setup-node@v4
```

The `rm` alias works the same as `remove`.

## What it does

1. **Removes from configuration** - Deletes the action entry from `dotgithub.json`
2. **Deletes generated files** - Removes TypeScript files (unless `--keep-files` is used)
3. **Updates index files** - Regenerates organization and root index files
4. **Confirms removal** - Shows success message with details

## File cleanup

When removing an action (without `--keep-files`), the command deletes:

- The main action TypeScript file
- Related type definition files
- Updates organization index files
- Updates root index files

## Keep files option

Use `--keep-files` when you want to:

- Remove tracking but keep the generated code
- Manually manage the TypeScript files
- Preserve custom modifications to generated files
- Temporarily disable an action

## Action reference matching

The command matches actions by:

- Repository name (org/repo)
- Version reference (if specified)
- Action path (for composite actions)

Examples of valid references:

- `actions/checkout` - Matches any version of checkout
- `actions/checkout@v4` - Matches specific version
- `actions/cache/restore` - Matches specific action path

## Error handling

The command will fail if:

- No matching action is found
- The action reference format is invalid
- File deletion fails due to permissions
- Configuration file cannot be updated

## Success output

When successful, the command shows:

```
✅ Removed checkout from tracking
Deleted generated files: actions/actions/checkout.ts, actions/actions/index.ts
```

## When to use

Use this command to:

- **Clean up unused actions** - Remove actions no longer needed
- **Reduce bundle size** - Remove unnecessary dependencies
- **Update dependencies** - Remove old versions before adding new ones
- **Project maintenance** - Keep your action list current
- **Migration** - Remove deprecated actions during upgrades

## Best practices

1. **Use dry run first** - Check what will be removed with `dotgithub list`
2. **Keep files when uncertain** - Use `--keep-files` if you might need the code later
3. **Update imports** - Remove imports of deleted actions from your code
4. **Test after removal** - Ensure your workflows still work
5. **Commit changes** - Version control the updated configuration

## Related commands

- [dotgithub list](command-list.md) - See what actions are tracked
- [dotgithub add](command-add.md) - Add actions back if needed
- [dotgithub update](command-update.md) - Update instead of remove
- [dotgithub regenerate](command-regenerate.md) - Regenerate remaining actions

## See also

- [dotgithub add](command-add.md) - Add GitHub Actions to your project
- [dotgithub list](command-list.md) - List tracked actions
- [dotgithub update](command-update.md) - Update action versions
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
