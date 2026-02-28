# dotgithub unpin

Remove a pinned action from a construct or stack.

## Synopsis

```bash
dotgithub unpin <action> [options]
```

## Description

The `unpin` command removes version pins for GitHub Actions from specific constructs or stacks. This allows the construct or stack to use the default version of the action instead of the pinned version.

## Arguments

- `<action>` - Action to unpin (e.g., `actions/checkout`)

## Options

- `--stack <name>` - Unpin from specific stack
- `--construct <name>` - Unpin from specific construct

## Examples

### Unpin action from a construct

```bash
dotgithub unpin actions/checkout --construct my-construct
```

Removes the version pin for the checkout action from the "my-construct" construct.

### Unpin action from a stack

```bash
dotgithub unpin actions/setup-node --stack ci
```

Removes the version pin for the setup-node action from the "ci" stack.

## How it works

1. **Validates action format** - Ensures action is in `org/repo` format
2. **Validates scope** - Ensures either `--stack` or `--construct` is specified
3. **Checks existence** - Verifies the construct/stack exists in configuration
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

### Construct scope

```bash
dotgithub unpin actions/checkout --construct my-construct
```

- Removes the version pin for the specified construct
- Construct will use the default version of the action
- Other constructs are unaffected

### Stack scope

```bash
dotgithub unpin actions/checkout --stack ci
```

- Removes the version pin for the specified stack
- Stack will use the default version of the action
- Other stacks are unaffected

## Configuration updates

Unpinning removes the pin from your `dotgithub.json` configuration:

Pins are stored on each construct or stack. Unpinning removes the action from that construct's or stack's `actions` object.

## Success and warning messages

### Successful unpin

```
✅ Unpinned actions/checkout from construct "my-construct"
```

### Action was not pinned

```
⚠️  actions/checkout was not pinned for construct "my-construct"
```

## Use cases

### Removing outdated pins

```bash
# Remove pin to allow using latest version
dotgithub unpin actions/checkout --construct my-construct
```

### Cleaning up configuration

```bash
# Remove unnecessary pins
dotgithub unpin actions/setup-node --stack ci
```

### Migrating to default versions

```bash
# Remove custom pins to use standard versions
dotgithub unpin actions/checkout --construct legacy-construct
```

## Error handling

The command will fail if:

- Action format is invalid (must be `org/repo`)
- Neither `--stack` nor `--construct` is specified
- Both `--stack` and `--construct` are specified
- Specified construct doesn't exist
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
- [dotgithub construct](command-construct.md) - Manage constructs and stacks
- [dotgithub update](command-update.md) - Update action versions

## See also

- [dotgithub pin](command-pin.md) - Pin action versions
- [dotgithub list-pins](command-list-pins.md) - List all pins
- [dotgithub construct](command-construct.md) - Manage constructs and stacks
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
