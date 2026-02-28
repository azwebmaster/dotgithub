# dotgithub pin

Pin an action to a specific version for a construct or stack.

## Synopsis

```bash
dotgithub pin <action> <ref> [options]
```

## Description

The `pin` command allows you to override the version of a GitHub Action for specific constructs or stacks. This is useful when you need to use different versions of the same action in different contexts, or when you want to lock a specific version for stability.

## Arguments

- `<action>` - Action to pin (e.g., `actions/checkout`)
- `<ref>` - Version reference to pin to (e.g., `v4`, `v5.1.0`)

## Options

- `--stack <name>` - Pin for specific stack
- `--construct <name>` - Pin for specific construct

## Examples

### Pin action for a construct

```bash
dotgithub pin actions/checkout v4 --construct my-construct
```

Pins the checkout action to version 4 for the "my-construct" construct.

### Pin action for a stack

```bash
dotgithub pin actions/setup-node v4.1.0 --stack ci
```

Pins the setup-node action to version 4.1.0 for the "ci" stack.

### Pin to specific commit

```bash
dotgithub pin actions/checkout abc1234 --construct deploy
```

Pins the checkout action to a specific commit SHA for the "deploy" construct.

## How it works

1. **Validates action format** - Ensures action is in `org/repo` format
2. **Validates scope** - Ensures either `--stack` or `--construct` is specified
3. **Checks existence** - Verifies the construct/stack exists in configuration
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

### Construct scope

```bash
dotgithub pin actions/checkout v4 --construct my-construct
```

- Overrides the action version for the specified construct
- Only affects that construct's workflow generation
- Other constructs use their default versions

### Stack scope

```bash
dotgithub pin actions/checkout v4 --stack ci
```

- Overrides the action version for the specified stack
- Affects all constructs in that stack
- Other stacks use their default versions

## Configuration storage

Pins are stored in your `dotgithub.json` configuration:

Pins are stored on each construct or stack in your configuration. Construct-level pins are stored in the construct's `actions` property; stack-level pins in the stack's `actions` property.

## Use cases

### Construct-specific versions

```bash
# Use older version for legacy construct
dotgithub pin actions/checkout v3 --construct legacy-construct

# Use newer version for modern construct
dotgithub pin actions/checkout v4 --construct modern-construct
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
- Neither `--stack` nor `--construct` is specified
- Both `--stack` and `--construct` are specified
- Specified construct doesn't exist
- Specified stack doesn't exist

## Success output

When successful, the command shows:

```
✅ Pinned actions/checkout to v4 for construct "my-construct"
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
- [dotgithub construct](command-construct.md) - Manage constructs and stacks
- [dotgithub update](command-update.md) - Update action versions

## See also

- [dotgithub unpin](command-unpin.md) - Remove version pins
- [dotgithub list-pins](command-list-pins.md) - List all pins
- [dotgithub construct](command-construct.md) - Manage constructs and stacks
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
