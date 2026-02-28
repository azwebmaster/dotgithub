# dotgithub construct

Manage constructs and stacks.

## Synopsis

```bash
dotgithub construct <subcommand> [options]
```

## Description

The `construct` command provides comprehensive management of DotGitHub constructs and stacks. Constructs are the core mechanism for generating workflows, while stacks group constructs together for organized workflow generation.

## Subcommands

### Construct Management

- `construct list` - List configured constructs
- `construct add` - Add a construct configuration
- `construct remove` - Remove a construct configuration
- `construct create` - Create a construct from .github files
- `construct describe` - Describe construct information and configuration schema

### Stack Management

- `construct stack list` - List configured stacks
- `construct stack add` - Add a stack configuration
- `construct stack remove` - Remove a stack configuration

## Construct Commands

### construct list

List all configured constructs.

```bash
dotgithub construct list
```

Shows all constructs with their status (enabled/disabled) and configuration.

### construct add

Add a new construct to your configuration.

```bash
dotgithub construct add --name <name> --package <package> [options]
```

**Options:**

- `--name <name>` - Construct name (required)
- `--package <package>` - Construct package (npm package or local path) (required)
- `--enabled` - Enable the construct (default: true)
- `--config <json>` - Construct configuration as JSON string

**Examples:**

```bash
# Add a local construct
dotgithub construct add --name "my-construct" --package "./constructs/my-construct"

# Add an npm package
dotgithub construct add --name "ci-construct" --package "@myorg/ci-construct"

# Add with configuration
dotgithub construct add --name "deploy" --package "./deploy-construct" --config '{"environment": "production"}'
```

### construct remove

Remove a construct from your configuration.

```bash
dotgithub construct remove --name <name>
```

**Options:**

- `--name <name>` - Construct name to remove (required)

### construct create

Create a construct from existing .github files.

```bash
dotgithub construct create --name <name> --source <path|repo|url> [options]
```

**Options:**

- `--name <name>` - Construct name (required)
- `--source <path|repo|url>` - Source of .github files (required)
- `--description <desc>` - Construct description
- `--overwrite` - Overwrite existing construct file
- `--auto-add-actions` - Automatically add TypeScript actions found in workflows
- `--token <token>` - GitHub token for auto-adding actions

**Examples:**

```bash
# Create from local directory
dotgithub construct create --name "my-workflows" --source "./.github"

# Create from GitHub repository
dotgithub construct create --name "example-construct" --source "octocat/example-repo@main"

# Create with auto-action detection
dotgithub construct create --name "ci-construct" --source "./.github" --auto-add-actions
```

### construct describe

Describe construct information and configuration schema.

```bash
dotgithub construct describe [options]
```

**Options:**

- `--name <name>` - Specific construct name to describe
- `--format <format>` - Output format (text|markdown|json) (default: text)
- `--search <keyword>` - Search constructs by keyword
- `--category <category>` - Filter constructs by category
- `--all` - Describe all loaded constructs

**Examples:**

```bash
# Describe specific construct
dotgithub construct describe --name "my-construct"

# Search constructs
dotgithub construct describe --search "ci"

# Filter by category
dotgithub construct describe --category "deployment"

# Describe all constructs
dotgithub construct describe --all

# JSON output
dotgithub construct describe --name "my-construct" --format json
```

## Stack Commands

### construct stack list

List all configured stacks.

```bash
dotgithub construct stack list
```

Shows all stacks with their associated constructs and configuration.

### construct stack add

Add a new stack configuration.

```bash
dotgithub construct stack add --name <name> --constructs <constructs> [options]
```

**Options:**

- `--name <name>` - Stack name (required)
- `--constructs <constructs>` - Comma-separated list of construct names (required)
- `--config <json>` - Stack configuration as JSON string

**Examples:**

```bash
# Add a CI stack
dotgithub construct stack add --name "ci" --constructs "checkout,setup-node,test"

# Add with configuration
dotgithub construct stack add --name "deploy" --constructs "build,deploy" --config '{"environment": "production"}'
```

### construct stack remove

Remove a stack from your configuration.

```bash
dotgithub construct stack remove --name <name>
```

**Options:**

- `--name <name>` - Stack name to remove (required)

## Construct Development

### Creating Constructs

Constructs are TypeScript classes that implement the `GitHubConstruct` interface:

```typescript
import { GitHubConstruct, GitHubStack } from '@dotgithub/core';

export class MyConstruct implements GitHubConstruct {
  readonly name = 'my-construct';
  readonly version = '1.0.0';
  readonly description = 'My custom construct';

  validate(stack: GitHubStack): void {
    // Validate stack configuration
  }

  describe(): ConstructDescription {
    // Return construct metadata
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    // Generate workflows
  }
}

export default new MyConstruct();
```

### Construct Configuration

Constructs can accept configuration through the `config` property in `dotgithub.json`:

```json
{
  "constructs": [
    {
      "name": "my-construct",
      "package": "./constructs/my-construct",
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

Stacks group constructs together for organized workflow generation:

```json
{
  "stacks": [
    {
      "name": "ci",
      "constructs": ["checkout", "setup-node", "test"],
      "config": {
        "node-version": "18"
      }
    }
  ]
}
```

## Best Practices

1. **Construct naming** - Use descriptive, kebab-case names
2. **Configuration validation** - Always validate construct configuration
3. **Error handling** - Provide clear error messages
4. **Documentation** - Include comprehensive construct descriptions
5. **Testing** - Test constructs thoroughly before use
6. **Versioning** - Use semantic versioning for constructs

## See also

- [dotgithub synth](command-synth.md) - Synthesize workflows using constructs
- [Construct Development Guide](construct-development.md) - Creating custom constructs
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
- [dotgithub init](command-init.md) - Initialize a new project
