# dotgithub list

List all tracked GitHub Actions.

## Synopsis

```bash
dotgithub list
```

## Description

The `list` command displays all GitHub Actions that are currently tracked in your `dotgithub.json` configuration file. This is useful for getting an overview of your project's dependencies and verifying which actions have been added.

## Examples

### List all tracked actions

```bash
dotgithub list
```

Output example:

```
Found 3 tracked actions:
  📦 actions/checkout
     Function Name: checkout()
     Version: v4
     SHA: 0057852b
     Output Path: /path/to/project/src/actions/actions/checkout.ts
  📦 actions/setup-node
     Function Name: setupNode()
     Version: v4
     SHA: 2028fbc5
     Output Path: /path/to/project/src/actions/actions/setup-node.ts
  📦 actions/setup-python
     Function Name: setupPython()
     Version: v6
     SHA: e797f83b
     Output Path: /path/to/project/src/actions/actions/setup-python.ts
```

## Output information

For each tracked action, the command displays:

- **Repository** - The GitHub repository (org/repo format)
- **Function Name** - The generated TypeScript function name
- **Version** - The version reference (tag or branch)
- **SHA** - The resolved commit SHA (first 8 characters)
- **Output Path** - The generated TypeScript file location

## When to use

Use this command to:

- **Audit dependencies** - See all actions your project uses
- **Verify additions** - Confirm actions were added correctly
- **Debug issues** - Check if actions are properly tracked
- **Documentation** - Generate lists for project documentation
- **Migration** - Review actions when upgrading DotGitHub

## Related commands

- [dotgithub add](command-add.md) - Add new actions to tracking
- [dotgithub remove](command-remove.md) - Remove actions from tracking
- [dotgithub update](command-update.md) - Update action versions
- [dotgithub config list](command-config.md) - Alternative listing with JSON output

## Error handling

The command will fail if:

- No `dotgithub.json` configuration file exists
- Configuration file is invalid or corrupted
- Actions array is missing from configuration

## Empty state

If no actions are tracked, the command displays:

```
No actions are currently tracked.
```

This typically means you need to run `dotgithub add` to add your first actions.

## See also

- [dotgithub add](command-add.md) - Add GitHub Actions to your project
- [dotgithub remove](command-remove.md) - Remove actions from tracking
- [dotgithub update](command-update.md) - Update action versions
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
