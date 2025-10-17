# dotgithub config

Manage dotgithub configuration.

## Synopsis

```bash
dotgithub config <subcommand> [options]
```

## Description

The `config` command provides comprehensive management of your DotGitHub configuration file (`dotgithub.json`). It allows you to view, modify, and initialize configuration settings.

## Subcommands

- `config show` - Show current configuration
- `config list` - List all tracked actions
- `config set-output-dir <directory>` - Set default output directory
- `config remove <orgRepo>` - Remove action from tracking
- `config init` - Initialize a new dotgithub config file

## Commands

### config show

Display the current configuration.

```bash
dotgithub config show
```

Shows the complete `dotgithub.json` configuration in JSON format.

**Example output:**
```json
{
  "version": "1.0.0",
  "rootDir": "src",
  "outputDir": ".github/workflows",
  "actions": [
    {
      "orgRepo": "actions/checkout",
      "ref": "0057852bfaa89a56745cba8c7296529d2fc39830",
      "versionRef": "v4",
      "actionName": "checkout",
      "outputPath": "actions/actions/checkout.ts"
    }
  ],
  "plugins": [],
  "stacks": []
}
```

### config list

List all tracked actions with detailed information.

```bash
dotgithub config list [options]
```

**Options:**
- `--json` - Output as JSON format

**Examples:**
```bash
# Human-readable format
dotgithub config list

# JSON format
dotgithub config list --json
```

**Example output:**
```
Tracked actions:
================

• checkout()
  Repository: actions/checkout@v4 (SHA: 0057852b)
  Output: /path/to/project/src/actions/actions/checkout.ts

• setupNode()
  Repository: actions/setup-node@v4 (SHA: 2028fbc5)
  Output: /path/to/project/src/actions/actions/setup-node.ts
```

### config set-output-dir

Set the default output directory for generated actions.

```bash
dotgithub config set-output-dir <directory>
```

**Arguments:**
- `<directory>` - The output directory path

**Examples:**
```bash
# Set relative path
dotgithub config set-output-dir ./actions

# Set absolute path
dotgithub config set-output-dir /path/to/actions
```

### config remove

Remove an action from tracking.

```bash
dotgithub config remove <orgRepo>
```

**Arguments:**
- `<orgRepo>` - The organization/repository to remove (e.g., `actions/checkout`)

**Examples:**
```bash
# Remove specific action
dotgithub config remove actions/checkout

# Remove another action
dotgithub config remove actions/setup-node
```

**Note:** This only removes the action from the configuration file. It does not delete generated TypeScript files. Use `dotgithub remove` to also delete files.

### config init

Initialize a new dotgithub configuration file.

```bash
dotgithub config init [options]
```

**Options:**
- `--output-dir <dir>` - Output directory for actions (default: `.github/actions`)
- `--format <format>` - Config file format (json, js, yaml, yml) (default: `json`)

**Examples:**
```bash
# Initialize with default settings
dotgithub config init

# Initialize with custom output directory
dotgithub config init --output-dir ./my-actions

# Initialize in YAML format
dotgithub config init --format yaml

# Initialize in JavaScript format
dotgithub config init --format js
```

## Configuration File Formats

DotGitHub supports multiple configuration file formats:

### JSON (default)
```json
{
  "version": "1.0.0",
  "rootDir": "src",
  "actions": []
}
```

### JavaScript
```javascript
module.exports = {
  version: "1.0.0",
  rootDir: "src",
  actions: []
};
```

### YAML
```yaml
version: "1.0.0"
rootDir: "src"
actions: []
```

## Configuration Structure

The `dotgithub.json` file contains:

- **version** - Configuration schema version
- **rootDir** - Root directory for generated TypeScript files
- **outputDir** - Output directory for generated workflow files
- **actions** - Array of tracked GitHub Actions
- **plugins** - Array of plugin configurations
- **stacks** - Array of stack configurations
- **options** - Global options and settings

## Action Configuration

Each action in the configuration includes:

```json
{
  "orgRepo": "actions/checkout",
  "ref": "0057852bfaa89a56745cba8c7296529d2fc39830",
  "versionRef": "v4",
  "actionName": "checkout",
  "outputPath": "actions/actions/checkout.ts",
  "actionPath": null
}
```

- **orgRepo** - GitHub repository (org/repo)
- **ref** - Specific commit SHA
- **versionRef** - Version reference (tag or branch)
- **actionName** - Generated function name
- **outputPath** - Relative path to generated TypeScript file
- **actionPath** - Sub-path for composite actions

## Plugin Configuration

Plugin configuration structure:

```json
{
  "name": "my-plugin",
  "package": "./plugins/my-plugin",
  "config": {
    "environment": "production"
  },
  "enabled": true
}
```

## Stack Configuration

Stack configuration structure:

```json
{
  "name": "ci",
  "plugins": ["checkout", "setup-node", "test"],
  "config": {
    "node-version": "18"
  }
}
```

## Error Handling

The command will fail if:
- Configuration file doesn't exist (except for `init`)
- Configuration file is invalid JSON
- Specified action doesn't exist (for `remove`)
- Output directory cannot be created (for `init`)
- Invalid format specified (for `init`)

## Best Practices

1. **Version control** - Always commit your `dotgithub.json` file
2. **Backup before changes** - Make backups before major configuration changes
3. **Use relative paths** - Prefer relative paths for portability
4. **Validate configuration** - Use `config show` to verify changes
5. **Document custom settings** - Add comments for non-standard configurations

## See also

- [dotgithub list](command-list.md) - Alternative way to list actions
- [dotgithub remove](command-remove.md) - Remove actions and files
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
- [dotgithub init](command-init.md) - Initialize a new project
