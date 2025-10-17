# dotgithub unpin

Remove a pinned action from a plugin or stack.

## Synopsis

```bash
dotgithub unpin <action> [options]
```

## Description

The `unpin` command removes version pins for GitHub Actions from specific plugins or stacks. This allows the plugin or stack to use the default version of the action instead of the pinned version.

## Arguments

- `<action>` - Action to unpin (e.g., `actions/checkout`)

## Options

- `--stack <name>` - Unpin from specific stack
- `--plugin <name>` - Unpin from specific plugin

## Examples

### Unpin action from a plugin

```bash
dotgithub unpin actions/checkout --plugin my-plugin
```

Removes the version pin for the checkout action from the "my-plugin" plugin.

### Unpin action from a stack

```bash
dotgithub unpin actions/setup-node --stack ci
```

Removes the version pin for the setup-node action from the "ci" stack.

## How it works

1. **Validates action format** - Ensures action is in `org/repo` format
2. **Validates scope** - Ensures either `--stack` or `--plugin` is specified
3. **Checks existence** - Verifies the plugin/stack exists in configuration
4. **Removes pin** - Deletes the version override from the configuration
5. **Confirms action** - Shows success or warning message

## Action format

Actions must be specified in the format: `org/repo`

Examples:

- `actions/checkout` - GitHub's checkout action
- `actions/setup-node` - GitHub's setup-node action
- `myorg/my-action` - Custom organization action

## Scope specification

You must specify exactly one scope:

### Plugin scope

```bash
dotgithub unpin actions/checkout --plugin my-plugin
```

- Removes the version pin for the specified plugin
- Plugin will use the default version of the action
- Other plugins are unaffected

### Stack scope

```bash
dotgithub unpin actions/checkout --stack ci
```

- Removes the version pin for the specified stack
- Stack will use the default version of the action
- Other stacks are unaffected

## Configuration updates

Unpinning removes the pin from your `dotgithub.json` configuration:

**Before:**

```json
{
  "pins": {
    "plugins": {
      "my-plugin": {
        "actions/checkout": "v4"
      }
    }
  }
}
```

**After:**

```json
{
  "pins": {
    "plugins": {
      "my-plugin": {}
    }
  }
}
```

## Success and warning messages

### Successful unpin

```
✅ Unpinned actions/checkout from plugin "my-plugin"
```

### Action was not pinned

```
⚠️  actions/checkout was not pinned for plugin "my-plugin"
```

## Use cases

### Removing outdated pins

```bash
# Remove pin to allow using latest version
dotgithub unpin actions/checkout --plugin my-plugin
```

### Cleaning up configuration

```bash
# Remove unnecessary pins
dotgithub unpin actions/setup-node --stack ci
```

### Migrating to default versions

```bash
# Remove custom pins to use standard versions
dotgithub unpin actions/checkout --plugin legacy-plugin
```

## Error handling

The command will fail if:

- Action format is invalid (must be `org/repo`)
- Neither `--stack` nor `--plugin` is specified
- Both `--stack` and `--plugin` are specified
- Specified plugin doesn't exist
- Specified stack doesn't exist

## Best practices

1. **Verify before unpinning** - Use `dotgithub list-pins` to see current pins
2. **Test after unpinning** - Ensure workflows still work with default versions
3. **Document changes** - Note why pins were removed
4. **Gradual migration** - Unpin one action at a time for testing
5. **Version control** - Commit configuration changes

## Related commands

- [dotgithub pin](command-pin.md) - Pin action versions
- [dotgithub list-pins](command-list-pins.md) - List all pins
- [dotgithub plugin](command-plugin.md) - Manage plugins and stacks
- [dotgithub update](command-update.md) - Update action versions

## See also

- [dotgithub pin](command-pin.md) - Pin action versions
- [dotgithub list-pins](command-list-pins.md) - List all pins
- [dotgithub plugin](command-plugin.md) - Manage plugins and stacks
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
