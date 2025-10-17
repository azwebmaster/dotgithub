# dotgithub list-pins

List all pinned actions.

## Synopsis

```bash
dotgithub list-pins [options]
```

## Description

The `list-pins` command displays all version pins for GitHub Actions across your plugins and stacks. This helps you understand which actions have version overrides and what versions are being used.

## Options

- `--stack <name>` - List pins for specific stack
- `--plugin <name>` - List pins for specific plugin
- `--all` - Show all pinned actions across all scopes

## Examples

### List all pins

```bash
dotgithub list-pins
```

Shows all pinned actions across all plugins and stacks.

### List pins for specific plugin

```bash
dotgithub list-pins --plugin my-plugin
```

Shows only pins for the "my-plugin" plugin.

### List pins for specific stack

```bash
dotgithub list-pins --stack ci
```

Shows only pins for the "ci" stack.

### Show all pins explicitly

```bash
dotgithub list-pins --all
```

Explicitly shows all pinned actions (same as no options).

## Output formats

### All pins (default)

```
Plugin Overrides:
  my-plugin:
    actions/checkout: v4
    actions/setup-node: v4.1.0

Stack Overrides:
  ci:
    actions/checkout: v4
  production:
    actions/setup-node: v4.1.0
```

### Plugin-specific pins

```
Plugin Overrides (my-plugin):
  actions/checkout: v4
  actions/setup-node: v4.1.0
```

### Stack-specific pins

```
Stack Overrides (ci):
  actions/checkout: v4
```

### No pins found

```
No pinned actions found.
```

## Understanding the output

### Plugin Overrides

- Shows actions pinned for specific plugins
- Each plugin can have its own version overrides
- Affects only that plugin's workflow generation

### Stack Overrides

- Shows actions pinned for specific stacks
- Affects all plugins within that stack
- Overrides plugin-level pins for that stack

### Version references

- **Tags** - `v4`, `v5.1.0`, `latest`
- **Branches** - `main`, `develop`
- **Commit SHAs** - `abc1234`, `0057852b`

## Use cases

### Audit current pins

```bash
dotgithub list-pins
```

Review all version overrides in your project.

### Debug plugin issues

```bash
dotgithub list-pins --plugin problematic-plugin
```

Check if version pins are causing issues.

### Verify stack configuration

```bash
dotgithub list-pins --stack production
```

Ensure production stack has correct version pins.

### Migration planning

```bash
dotgithub list-pins --all
```

Plan migration from pinned to default versions.

## Error handling

The command will fail if:

- Multiple options are specified (e.g., both `--stack` and `--plugin`)
- Specified plugin doesn't exist
- Specified stack doesn't exist

## Best practices

1. **Regular audits** - Periodically review all pins
2. **Document pins** - Add comments explaining why versions are pinned
3. **Test after changes** - Verify workflows work with pinned versions
4. **Minimize pins** - Only pin when necessary
5. **Version control** - Commit pin changes to track history

## Related commands

- [dotgithub pin](command-pin.md) - Pin action versions
- [dotgithub unpin](command-unpin.md) - Remove version pins
- [dotgithub plugin](command-plugin.md) - Manage plugins and stacks
- [dotgithub update](command-update.md) - Update action versions

## See also

- [dotgithub pin](command-pin.md) - Pin action versions
- [dotgithub unpin](command-unpin.md) - Remove version pins
- [dotgithub plugin](command-plugin.md) - Manage plugins and stacks
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
