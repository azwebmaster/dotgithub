# dotgithub pin

Pin an action to a specific version for a plugin or stack.

## Synopsis

```bash
dotgithub pin <action> <ref> [options]
```

## Description

The `pin` command allows you to override the version of a GitHub Action for specific plugins or stacks. This is useful when you need to use different versions of the same action in different contexts, or when you want to lock a specific version for stability.

## Arguments

- `<action>` - Action to pin (e.g., `actions/checkout`)
- `<ref>` - Version reference to pin to (e.g., `v4`, `v5.1.0`)

## Options

- `--stack <name>` - Pin for specific stack
- `--plugin <name>` - Pin for specific plugin

## Examples

### Pin action for a plugin

```bash
dotgithub pin actions/checkout v4 --plugin my-plugin
```

Pins the checkout action to version 4 for the "my-plugin" plugin.

### Pin action for a stack

```bash
dotgithub pin actions/setup-node v4.1.0 --stack ci
```

Pins the setup-node action to version 4.1.0 for the "ci" stack.

### Pin to specific commit

```bash
dotgithub pin actions/checkout abc1234 --plugin deploy
```

Pins the checkout action to a specific commit SHA for the "deploy" plugin.

## How it works

1. **Validates action format** - Ensures action is in `org/repo` format
2. **Validates scope** - Ensures either `--stack` or `--plugin` is specified
3. **Checks existence** - Verifies the plugin/stack exists in configuration
4. **Sets pin** - Adds the version override to the configuration
5. **Confirms action** - Shows success message with details

## Action format

Actions must be specified in the format: `org/repo`

Examples:
- `actions/checkout` - GitHub's checkout action
- `actions/setup-node` - GitHub's setup-node action
- `myorg/my-action` - Custom organization action

## Version references

Version references can be:
- **Tags** - `v4`, `v5.1.0`, `latest`
- **Branches** - `main`, `develop`
- **Commit SHAs** - `abc1234`, `0057852b`

## Scope specification

You must specify exactly one scope:

### Plugin scope
```bash
dotgithub pin actions/checkout v4 --plugin my-plugin
```
- Overrides the action version for the specified plugin
- Only affects that plugin's workflow generation
- Other plugins use their default versions

### Stack scope
```bash
dotgithub pin actions/checkout v4 --stack ci
```
- Overrides the action version for the specified stack
- Affects all plugins in that stack
- Other stacks use their default versions

## Configuration storage

Pins are stored in your `dotgithub.json` configuration:

```json
{
  "pins": {
    "plugins": {
      "my-plugin": {
        "actions/checkout": "v4"
      }
    },
    "stacks": {
      "ci": {
        "actions/setup-node": "v4.1.0"
      }
    }
  }
}
```

## Use cases

### Plugin-specific versions
```bash
# Use older version for legacy plugin
dotgithub pin actions/checkout v3 --plugin legacy-plugin

# Use newer version for modern plugin
dotgithub pin actions/checkout v4 --plugin modern-plugin
```

### Stack-specific versions
```bash
# Use stable version for production stack
dotgithub pin actions/setup-node v4.1.0 --stack production

# Use latest version for development stack
dotgithub pin actions/setup-node v5 --stack development
```

### Security patches
```bash
# Pin to patched version
dotgithub pin actions/checkout v4.1.1 --stack security-critical
```

## Error handling

The command will fail if:
- Action format is invalid (must be `org/repo`)
- Neither `--stack` nor `--plugin` is specified
- Both `--stack` and `--plugin` are specified
- Specified plugin doesn't exist
- Specified stack doesn't exist

## Success output

When successful, the command shows:
```
✅ Pinned actions/checkout to v4 for plugin "my-plugin"
```

## Best practices

1. **Document pins** - Add comments explaining why versions are pinned
2. **Regular updates** - Review and update pins periodically
3. **Test pinned versions** - Verify pinned versions work correctly
4. **Use semantic versions** - Prefer version tags over commit SHAs
5. **Minimize pins** - Only pin when necessary to avoid maintenance overhead

## Related commands

- [dotgithub unpin](command-unpin.md) - Remove version pins
- [dotgithub list-pins](command-list-pins.md) - List all pins
- [dotgithub plugin](command-plugin.md) - Manage plugins and stacks
- [dotgithub update](command-update.md) - Update action versions

## See also

- [dotgithub unpin](command-unpin.md) - Remove version pins
- [dotgithub list-pins](command-list-pins.md) - List all pins
- [dotgithub plugin](command-plugin.md) - Manage plugins and stacks
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
