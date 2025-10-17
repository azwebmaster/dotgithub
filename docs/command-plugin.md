# dotgithub plugin

Manage plugins and stacks.

## Synopsis

```bash
dotgithub plugin <subcommand> [options]
```

## Description

The `plugin` command provides comprehensive management of DotGitHub plugins and stacks. Plugins are the core mechanism for generating workflows, while stacks group plugins together for organized workflow generation.

## Subcommands

### Plugin Management

- `plugin list` - List configured plugins
- `plugin add` - Add a plugin configuration
- `plugin remove` - Remove a plugin configuration
- `plugin create` - Create a plugin from .github files
- `plugin describe` - Describe plugin information and configuration schema

### Stack Management

- `plugin stack list` - List configured stacks
- `plugin stack add` - Add a stack configuration
- `plugin stack remove` - Remove a stack configuration

## Plugin Commands

### plugin list

List all configured plugins.

```bash
dotgithub plugin list
```

Shows all plugins with their status (enabled/disabled) and configuration.

### plugin add

Add a new plugin to your configuration.

```bash
dotgithub plugin add --name <name> --package <package> [options]
```

**Options:**
- `--name <name>` - Plugin name (required)
- `--package <package>` - Plugin package (npm package or local path) (required)
- `--enabled` - Enable the plugin (default: true)
- `--config <json>` - Plugin configuration as JSON string

**Examples:**
```bash
# Add a local plugin
dotgithub plugin add --name "my-plugin" --package "./plugins/my-plugin"

# Add an npm package
dotgithub plugin add --name "ci-plugin" --package "@myorg/ci-plugin"

# Add with configuration
dotgithub plugin add --name "deploy" --package "./deploy-plugin" --config '{"environment": "production"}'
```

### plugin remove

Remove a plugin from your configuration.

```bash
dotgithub plugin remove --name <name>
```

**Options:**
- `--name <name>` - Plugin name to remove (required)

### plugin create

Create a plugin from existing .github files.

```bash
dotgithub plugin create --name <name> --source <path|repo|url> [options]
```

**Options:**
- `--name <name>` - Plugin name (required)
- `--source <path|repo|url>` - Source of .github files (required)
- `--description <desc>` - Plugin description
- `--overwrite` - Overwrite existing plugin file
- `--auto-add-actions` - Automatically add TypeScript actions found in workflows
- `--token <token>` - GitHub token for auto-adding actions

**Examples:**
```bash
# Create from local directory
dotgithub plugin create --name "my-workflows" --source "./.github"

# Create from GitHub repository
dotgithub plugin create --name "example-plugin" --source "octocat/example-repo@main"

# Create with auto-action detection
dotgithub plugin create --name "ci-plugin" --source "./.github" --auto-add-actions
```

### plugin describe

Describe plugin information and configuration schema.

```bash
dotgithub plugin describe [options]
```

**Options:**
- `--name <name>` - Specific plugin name to describe
- `--format <format>` - Output format (text|markdown|json) (default: text)
- `--search <keyword>` - Search plugins by keyword
- `--category <category>` - Filter plugins by category
- `--all` - Describe all loaded plugins

**Examples:**
```bash
# Describe specific plugin
dotgithub plugin describe --name "my-plugin"

# Search plugins
dotgithub plugin describe --search "ci"

# Filter by category
dotgithub plugin describe --category "deployment"

# Describe all plugins
dotgithub plugin describe --all

# JSON output
dotgithub plugin describe --name "my-plugin" --format json
```

## Stack Commands

### plugin stack list

List all configured stacks.

```bash
dotgithub plugin stack list
```

Shows all stacks with their associated plugins and configuration.

### plugin stack add

Add a new stack configuration.

```bash
dotgithub plugin stack add --name <name> --plugins <plugins> [options]
```

**Options:**
- `--name <name>` - Stack name (required)
- `--plugins <plugins>` - Comma-separated list of plugin names (required)
- `--config <json>` - Stack configuration as JSON string

**Examples:**
```bash
# Add a CI stack
dotgithub plugin stack add --name "ci" --plugins "checkout,setup-node,test"

# Add with configuration
dotgithub plugin stack add --name "deploy" --plugins "build,deploy" --config '{"environment": "production"}'
```

### plugin stack remove

Remove a stack from your configuration.

```bash
dotgithub plugin stack remove --name <name>
```

**Options:**
- `--name <name>` - Stack name to remove (required)

## Plugin Development

### Creating Plugins

Plugins are TypeScript classes that implement the `DotGitHubPlugin` interface:

```typescript
import { DotGitHubPlugin, GitHubStack } from '@dotgithub/core';

export class MyPlugin implements DotGitHubPlugin {
  readonly name = 'my-plugin';
  readonly version = '1.0.0';
  readonly description = 'My custom plugin';

  validate(stack: GitHubStack): void {
    // Validate stack configuration
  }

  describe(): PluginDescription {
    // Return plugin metadata
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    // Generate workflows
  }
}

export default new MyPlugin();
```

### Plugin Configuration

Plugins can accept configuration through the `config` property in `dotgithub.json`:

```json
{
  "plugins": [
    {
      "name": "my-plugin",
      "package": "./plugins/my-plugin",
      "config": {
        "environment": "production",
        "timeout": 30
      },
      "enabled": true
    }
  ]
}
```

## Stack Configuration

Stacks group plugins together for organized workflow generation:

```json
{
  "stacks": [
    {
      "name": "ci",
      "plugins": ["checkout", "setup-node", "test"],
      "config": {
        "node-version": "18"
      }
    }
  ]
}
```

## Best Practices

1. **Plugin naming** - Use descriptive, kebab-case names
2. **Configuration validation** - Always validate plugin configuration
3. **Error handling** - Provide clear error messages
4. **Documentation** - Include comprehensive plugin descriptions
5. **Testing** - Test plugins thoroughly before use
6. **Versioning** - Use semantic versioning for plugins

## See also

- [dotgithub synth](command-synth.md) - Synthesize workflows using plugins
- [Plugin Development Guide](plugin-development.md) - Creating custom plugins
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
- [dotgithub init](command-init.md) - Initialize a new project
