# Plugin Describe Command

The `plugin describe` command provides comprehensive information about plugins, including their configuration schemas, metadata, and examples.

## Usage

```bash
dotgithub plugin describe [options]
```

## Options

### `--name <name>`
Describe a specific plugin by name.

```bash
dotgithub plugin describe --name example
```

### `--format <format>`
Specify the output format. Available formats:
- `text` (default): Human-readable text format
- `markdown`: Markdown documentation format
- `json`: JSON format for programmatic use

```bash
dotgithub plugin describe --name example --format markdown
dotgithub plugin describe --name example --format json
```

### `--search <keyword>`
Search plugins by keyword. Searches in plugin names, descriptions, keywords, and tags.

```bash
dotgithub plugin describe --search ci
dotgithub plugin describe --search testing
```

### `--category <category>`
Filter plugins by category.

```bash
dotgithub plugin describe --category ci
dotgithub plugin describe --category deployment
```

### `--all`
Describe all loaded plugins with full details.

```bash
dotgithub plugin describe --all
```

## Examples

### List Available Plugins

```bash
dotgithub plugin describe
```

Output:
```
🔌 Available plugins (1):

✅ example
   Version: 1.0.0
   Description: Example plugin for demonstrating plugin functionality
   Category: ci
   Keywords: example, ci, github-actions

💡 Use --name <plugin> to get detailed information about a specific plugin
💡 Use --search <keyword> to search plugins by keyword
💡 Use --category <category> to filter by category
💡 Use --all to describe all plugins
```

### Describe Specific Plugin

```bash
dotgithub plugin describe --name example
```

Output:
```
🔌 Plugin: example

Name: example
Version: 1.0.0
Description: Example plugin for demonstrating plugin functionality
Author: DotGitHub Team
License: MIT
Category: ci
Keywords: example, ci, github-actions

Configuration: Configuration for the example plugin that sets up a basic CI workflow

Examples:
  Basic CI: Simple CI workflow with default settings
    Config: {
      "environment": "production"
    }
  Extended CI: CI workflow with custom timeout and Node version
    Config: {
      "environment": "staging",
      "timeout": 30,
      "nodeVersion": "20.5"
    }

Repository: https://github.com/azwebmaster/dotgithub
```

### Generate Markdown Documentation

```bash
dotgithub plugin describe --name example --format markdown
```

Output:
```markdown
# example

Example plugin for demonstrating plugin functionality

**Version:** 1.0.0
**Author:** DotGitHub Team
**License:** MIT
**Category:** ci

**Keywords:** `example`, `ci`, `github-actions`

## Configuration

Configuration for the example plugin that sets up a basic CI workflow

## Examples

### Basic CI

Simple CI workflow with default settings

```json
{
  "environment": "production"
}
```

### Extended CI

CI workflow with custom timeout and Node version

```json
{
  "environment": "staging",
  "timeout": 30,
  "nodeVersion": "20.5"
}
```

## Repository

[https://github.com/azwebmaster/dotgithub](https://github.com/azwebmaster/dotgithub)
```

### Search Plugins

```bash
dotgithub plugin describe --search ci
```

Output:
```
🔍 Found 1 plugin(s) matching "ci":

🔌 Plugin: example

Name: example
Version: 1.0.0
Description: Example plugin for demonstrating plugin functionality
...
```

### Filter by Category

```bash
dotgithub plugin describe --category ci
```

Output:
```
📂 Found 1 plugin(s) in category "ci":

🔌 Plugin: example

Name: example
Version: 1.0.0
Description: Example plugin for demonstrating plugin functionality
...
```

### Describe All Plugins

```bash
dotgithub plugin describe --all
```

Output:
```
🔌 Loaded plugins (1):

🔌 Plugin: example

Name: example
Version: 1.0.0
Description: Example plugin for demonstrating plugin functionality
Author: DotGitHub Team
License: MIT
Category: ci
Keywords: example, ci, github-actions

Configuration: Configuration for the example plugin that sets up a basic CI workflow

Examples:
  Basic CI: Simple CI workflow with default settings
    Config: {
      "environment": "production"
    }
  Extended CI: CI workflow with custom timeout and Node version
    Config: {
      "environment": "staging",
      "timeout": 30,
      "nodeVersion": "20.5"
    }

Repository: https://github.com/azwebmaster/dotgithub

──────────────────────────────────────────────────
```

## JSON Output

For programmatic use, you can get JSON output:

```bash
dotgithub plugin describe --name example --format json
```

Output:
```json
{
  "name": "example",
  "version": "1.0.0",
  "description": "Example plugin for demonstrating plugin functionality",
  "author": "DotGitHub Team",
  "repository": "https://github.com/azwebmaster/dotgithub",
  "license": "MIT",
  "keywords": ["example", "ci", "github-actions"],
  "category": "ci",
  "configSchema": { ... },
  "configDescription": "Configuration for the example plugin that sets up a basic CI workflow",
  "examples": [
    {
      "name": "Basic CI",
      "description": "Simple CI workflow with default settings",
      "config": {
        "environment": "production"
      }
    },
    {
      "name": "Extended CI",
      "description": "CI workflow with custom timeout and Node version",
      "config": {
        "environment": "staging",
        "timeout": 30,
        "nodeVersion": "20.5"
      }
    }
  ],
  "tags": ["ci", "testing", "automation"],
  "minDotGithubVersion": "1.0.0"
}
```

## Error Handling

The command provides helpful error messages for common issues:

### Plugin Not Found
```bash
$ dotgithub plugin describe --name nonexistent
❌ Plugin "nonexistent" not found or not loaded
```

### No Plugins Configured
```bash
$ dotgithub plugin describe
📝 No plugins configured
```

### Search No Results
```bash
$ dotgithub plugin describe --search nonexistent
🔍 No plugins found matching "nonexistent"
```

### Category No Results
```bash
$ dotgithub plugin describe --category nonexistent
📂 No plugins found in category "nonexistent"
```

## Integration with Other Commands

The `plugin describe` command works seamlessly with other plugin management commands:

```bash
# List configured plugins
dotgithub plugin list

# Describe a specific plugin
dotgithub plugin describe --name my-plugin

# Add a new plugin
dotgithub plugin add --name new-plugin --package ./my-plugin

# Describe the newly added plugin
dotgithub plugin describe --name new-plugin
```

## Use Cases

1. **Plugin Discovery**: Find plugins by searching keywords or browsing categories
2. **Configuration Reference**: Get detailed configuration schemas and examples
3. **Documentation Generation**: Generate markdown documentation for plugins
4. **Integration**: Use JSON output for programmatic plugin discovery
5. **Development**: Understand plugin capabilities and requirements

## Requirements

- Plugins must be configured in your `dotgithub.json` file
- Plugins must implement the `describe()` method to provide rich metadata
- Plugins should define configuration schemas for validation
