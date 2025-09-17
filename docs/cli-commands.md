# DotGithub CLI Commands

The DotGithub CLI provides commands for managing GitHub Actions, plugins, and workflow synthesis. This documentation covers all available commands with examples.

## Global Options

All commands support these global options:

```bash
-c, --config <path>    # Path to config file (default: .github/dotgithub.json)
-v, --verbose          # Enable verbose logging
-t, --token <token>    # GitHub token (overrides env GITHUB_TOKEN)
```

## Action Management Commands

### `dotgithub add`

Generate TypeScript types from GitHub Actions and save to output directory.

**Syntax:**
```bash
dotgithub add <orgRepoRef...> [options]
```

**Arguments:**
- `<orgRepoRef...>` - One or more GitHub repository references (e.g., actions/checkout@v4)

**Options:**
- `--output <outputDir>` - Output directory for generated TypeScript files
- `-t, --token <token>` - GitHub token (overrides env GITHUB_TOKEN)
- `--no-sha` - Use the original ref instead of resolving to SHA

**Examples:**
```bash
# Add a single action
dotgithub add actions/checkout@v4

# Add multiple actions
dotgithub add actions/checkout@v4 actions/setup-node@v4

# Specify custom output directory
dotgithub add actions/checkout@v4 --output ./src/actions

# Use original ref without SHA resolution
dotgithub add actions/checkout@v4 --no-sha

# Use custom GitHub token
dotgithub add actions/checkout@v4 --token ghp_xxxxxxxxxxxx
```

### `dotgithub update`

Update GitHub Actions to latest versions or use versionRef.

**Syntax:**
```bash
dotgithub update [orgRepoRef] [options]
```

**Arguments:**
- `[orgRepoRef]` - GitHub repository reference (optional; updates all if not provided)

**Options:**
- `--output <outputDir>` - Output directory for generated TypeScript files
- `-t, --token <token>` - GitHub token (overrides env GITHUB_TOKEN)
- `--latest` - Use the latest git tag with semver parsing instead of versionRef
- `--no-sha` - Use the original ref instead of resolving to SHA

**Examples:**
```bash
# Update all tracked actions
dotgithub update

# Update specific action
dotgithub update actions/checkout

# Update to latest available version
dotgithub update actions/checkout --latest

# Update without SHA resolution
dotgithub update actions/checkout --no-sha
```

### `dotgithub remove`

Remove a GitHub Action from tracking and delete generated files.

**Syntax:**
```bash
dotgithub remove <orgRepoRef> [options]
dotgithub rm <orgRepoRef> [options]      # Alias
```

**Arguments:**
- `<orgRepoRef>` - GitHub repository reference (e.g., actions/checkout@v4 or actions/checkout)

**Options:**
- `--keep-files` - Remove from tracking but keep generated files

**Examples:**
```bash
# Remove action and delete files
dotgithub remove actions/checkout@v4

# Remove from tracking but keep files
dotgithub remove actions/checkout --keep-files

# Using alias
dotgithub rm actions/setup-node
```

### `dotgithub list`

List all tracked GitHub Actions.

**Syntax:**
```bash
dotgithub list
```

**Example:**
```bash
dotgithub list
```

**Output:**
```
Found 2 tracked actions:

1. checkout()
   Repository: actions/checkout
   Version: v4
   SHA: 8ade135a41bc03ea155e62e844d188df1ea18608
   Output Path: .github/actions/actions/checkout.ts

2. setupNode()
   Repository: actions/setup-node
   Version: v4
   SHA: 60edb5dd326a2b5ce5e8dc9a6b3c0e8c1f3c0e8c
   Output Path: .github/actions/actions/setup-node.ts
```

### `dotgithub regenerate`

Regenerate TypeScript files based on the config.

**Syntax:**
```bash
dotgithub regenerate [pattern] [options]
```

**Arguments:**
- `[pattern]` - Optional glob pattern to filter actions (e.g., "actions/*" or "*/checkout")

**Options:**
- `-t, --token <token>` - GitHub token (overrides env GITHUB_TOKEN)
- `--prune` - Remove orphaned files not defined in config

**Examples:**
```bash
# Regenerate all actions
dotgithub regenerate

# Regenerate only actions from specific organization
dotgithub regenerate "actions/*"

# Regenerate specific action
dotgithub regenerate "*/checkout"

# Regenerate and remove orphaned files
dotgithub regenerate --prune
```

## Configuration Commands

### `dotgithub config`

Manage dotgithub configuration with various subcommands.

#### `dotgithub config show`

Show current configuration.

**Syntax:**
```bash
dotgithub config show
```

**Example:**
```bash
dotgithub config show
```

**Output:**
```
Configuration file: .github/dotgithub.json

Current configuration:
{
  "outputDir": ".github/actions",
  "actions": [
    {
      "orgRepo": "actions/checkout",
      "versionRef": "v4",
      "ref": "8ade135a41bc03ea155e62e844d188df1ea18608",
      "functionName": "checkout",
      "outputPath": ".github/actions/actions/checkout.ts"
    }
  ]
}
```

#### `dotgithub config list`

List all tracked actions.

**Syntax:**
```bash
dotgithub config list [options]
```

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
# List actions in human-readable format
dotgithub config list

# Output as JSON
dotgithub config list --json
```

#### `dotgithub config set-output-dir`

Set default output directory for generated actions.

**Syntax:**
```bash
dotgithub config set-output-dir <directory>
```

**Examples:**
```bash
# Set output directory
dotgithub config set-output-dir ./src/github-actions

# Set to relative path
dotgithub config set-output-dir ../shared/actions
```

#### `dotgithub config remove`

Remove action from tracking.

**Syntax:**
```bash
dotgithub config remove <orgRepo>
```

**Examples:**
```bash
# Remove action from config
dotgithub config remove actions/checkout
```

#### `dotgithub config init`

Initialize a new dotgithub config file.

**Syntax:**
```bash
dotgithub config init [options]
```

**Options:**
- `--output-dir <dir>` - Output directory for actions (default: .github/actions)
- `--format <format>` - Config file format: json, js, yaml, yml (default: json)

**Examples:**
```bash
# Initialize with defaults
dotgithub config init

# Initialize with custom output directory
dotgithub config init --output-dir ./actions

# Initialize with YAML format
dotgithub config init --format yaml

# Initialize with JavaScript format
dotgithub config init --format js
```

## Plugin and Stack Commands

### `dotgithub plugin`

Manage plugins with various subcommands.

#### `dotgithub plugin list`

List configured plugins.

**Syntax:**
```bash
dotgithub plugin list
```

**Example:**
```bash
dotgithub plugin list
```

**Output:**
```
🔌 Configured plugins (2):

✅ my-custom-plugin
   Package: ./plugins/my-custom-plugin.js
   Config: {
     "setting1": "value1",
     "setting2": true
   }

❌ disabled-plugin
   Package: @dotgithub/standard-plugin
```

#### `dotgithub plugin add`

Add a plugin configuration.

**Syntax:**
```bash
dotgithub plugin add --name <name> --package <package> [options]
```

**Options:**
- `--name <name>` - Plugin name (required)
- `--package <package>` - Plugin package: npm package or local path (required)
- `--config <json>` - Plugin configuration as JSON string
- `--enabled` - Enable the plugin (default: true)

**Examples:**
```bash
# Add simple plugin
dotgithub plugin add --name my-plugin --package ./plugins/my-plugin.js

# Add plugin with configuration
dotgithub plugin add --name advanced-plugin --package @company/github-plugin --config '{"apiUrl": "https://api.example.com", "timeout": 5000}'

# Add disabled plugin
dotgithub plugin add --name test-plugin --package ./test-plugin.js --enabled false
```

#### `dotgithub plugin remove`

Remove a plugin configuration.

**Syntax:**
```bash
dotgithub plugin remove --name <name>
```

**Examples:**
```bash
# Remove plugin
dotgithub plugin remove --name my-plugin
```

#### `dotgithub plugin create`

Create a plugin from .github files.

**Syntax:**
```bash
dotgithub plugin create --name <name> --source <path|repo|url> [options]
```

**Options:**
- `--name <name>` - Plugin name (required)
- `--source <path|repo|url>` - Local path, GitHub repo (org/repo@ref), or GitHub file URL (required)
- `--description <desc>` - Plugin description
- `--overwrite` - Overwrite existing plugin file

**Examples:**
```bash
# Create from local .github directory
dotgithub plugin create --name my-workflows --source ./.github

# Create from GitHub repository
dotgithub plugin create --name company-standards --source company/github-workflows@main

# Create from GitHub file URL
dotgithub plugin create --name single-workflow --source https://github.com/company/workflows/blob/main/.github/workflows/ci.yml

# Create with description and overwrite
dotgithub plugin create --name updated-plugin --source ./workflows --description "Updated company workflows" --overwrite
```

### `dotgithub plugin stack`

Manage GitHub stacks with various subcommands.

#### `dotgithub plugin stack list`

List configured stacks.

**Syntax:**
```bash
dotgithub plugin stack list
```

**Example:**
```bash
dotgithub plugin stack list
```

**Output:**
```
🏗️ Configured stacks (2):

📦 frontend-stack
   Plugins: lint-plugin, test-plugin, build-plugin
   Config: {
     "nodeVersion": "18",
     "packageManager": "bun"
   }

📦 backend-stack
   Plugins: test-plugin, security-scan
   Config: (none)
```

#### `dotgithub plugin stack add`

Add a stack configuration.

**Syntax:**
```bash
dotgithub plugin stack add --name <name> --plugins <plugins> [options]
```

**Options:**
- `--name <name>` - Stack name (required)
- `--plugins <plugins>` - Comma-separated list of plugin names (required)
- `--config <json>` - Stack configuration as JSON string

**Examples:**
```bash
# Add simple stack
dotgithub plugin stack add --name web-stack --plugins "lint,test,build"

# Add stack with configuration
dotgithub plugin stack add --name api-stack --plugins "test,security,deploy" --config '{"environment": "production", "region": "us-east-1"}'

# Add stack with multiple plugins
dotgithub plugin stack add --name full-stack --plugins "lint-js,lint-css,test-unit,test-e2e,build,deploy"
```

#### `dotgithub plugin stack remove`

Remove a stack configuration.

**Syntax:**
```bash
dotgithub plugin stack remove --name <name>
```

**Examples:**
```bash
# Remove stack
dotgithub plugin stack remove --name old-stack
```

## Workflow Synthesis Commands

### `dotgithub synth`

Synthesize GitHub workflows from configured stacks and plugins.

**Syntax:**
```bash
dotgithub synth [options]
```

**Options:**
- `--dry-run` - Preview files without writing them to disk
- `--output <dir>` - Output directory (default: .github)
- `--stack <name>` - Synthesize only the specified stack
- `--verbose` - Show detailed output

**Examples:**
```bash
# Synthesize all stacks
dotgithub synth

# Preview without writing files
dotgithub synth --dry-run

# Synthesize specific stack
dotgithub synth --stack frontend-stack

# Synthesize with verbose output
dotgithub synth --verbose

# Custom output directory
dotgithub synth --output ./github-config

# Dry run with verbose output
dotgithub synth --dry-run --verbose
```

**Dry Run Output Example:**
```
🧪 Dry run mode - no files will be written

📋 Would synthesize 2 stack(s):

🏗️  Stack: frontend-stack
   Plugins: lint, test, build
   Files to be written:
     📄 .github/workflows/frontend-ci.yml
     📄 .github/workflows/frontend-deploy.yml

🏗️  Stack: backend-stack
   Plugins: test, security
   Files to be written:
     📄 .github/workflows/backend-ci.yml
```

## Project Initialization Commands

### `dotgithub init`

Initialize a new GitHub Actions workspace with TypeScript and ESM support.

**Syntax:**
```bash
dotgithub init [options]
```

**Options:**
- `--force` - Overwrite existing files if they exist

**Examples:**
```bash
# Initialize workspace
dotgithub init

# Force overwrite existing files
dotgithub init --force
```

**Generated Files:**
- `.github/src/package.json` - Package configuration with TypeScript and ESM support
- `.github/src/tsconfig.json` - TypeScript configuration
- `.github/src/index.ts` - Entry point file

**Next Steps After Init:**
```bash
cd .github/src
npm install
```

## Configuration File Formats

DotGithub supports multiple configuration file formats:

### JSON Format (.github/dotgithub.json)
```json
{
  "outputDir": ".github/actions",
  "actions": [
    {
      "orgRepo": "actions/checkout",
      "versionRef": "v4",
      "ref": "sha256:...",
      "functionName": "checkout",
      "outputPath": ".github/actions/actions/checkout.ts"
    }
  ],
  "plugins": [
    {
      "name": "my-plugin",
      "package": "./plugins/my-plugin.js",
      "config": {"setting": "value"},
      "enabled": true
    }
  ],
  "stacks": [
    {
      "name": "web-stack",
      "plugins": ["lint", "test", "build"],
      "config": {"nodeVersion": "18"}
    }
  ]
}
```

### JavaScript Format (.github/dotgithub.js)
```javascript
export default {
  outputDir: '.github/actions',
  actions: [/* ... */],
  plugins: [/* ... */],
  stacks: [/* ... */]
};
```

### YAML Format (.github/dotgithub.yml)
```yaml
outputDir: .github/actions
actions:
  - orgRepo: actions/checkout
    versionRef: v4
    ref: sha256:...
    functionName: checkout
    outputPath: .github/actions/actions/checkout.ts
plugins:
  - name: my-plugin
    package: ./plugins/my-plugin.js
    config:
      setting: value
    enabled: true
stacks:
  - name: web-stack
    plugins: [lint, test, build]
    config:
      nodeVersion: "18"
```

## Environment Variables

- `GITHUB_TOKEN` - GitHub personal access token for API requests
- `DOTGITHUB_CONFIG` - Override default config file path

## Common Workflows

### Setting up a new project
```bash
# 1. Initialize the workspace
dotgithub init

# 2. Initialize configuration
dotgithub config init

# 3. Add some common actions
dotgithub add actions/checkout@v4 actions/setup-node@v4

# 4. Create a plugin from existing workflows
dotgithub plugin create --name my-workflows --source ./.github

# 5. Add plugin to config
dotgithub plugin add --name my-workflows --package ./plugins/my-workflows.js

# 6. Create a stack
dotgithub plugin stack add --name ci-stack --plugins "my-workflows"

# 7. Synthesize workflows
dotgithub synth
```

### Updating all actions
```bash
# Check what will be updated
dotgithub update --latest

# Update to latest versions
dotgithub update --latest

# Regenerate all files and clean up
dotgithub regenerate --prune
```

### Managing plugins
```bash
# List all plugins
dotgithub plugin list

# Add a new plugin
dotgithub plugin add --name security-scan --package @company/security-plugin

# Create a stack with multiple plugins
dotgithub plugin stack add --name security-stack --plugins "security-scan,vulnerability-check"

# Preview what workflows would be generated
dotgithub synth --dry-run --verbose
```