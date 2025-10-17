# dotgithub add

Add GitHub Actions to configuration and generate TypeScript files.

## Synopsis

```bash
dotgithub add <orgRepoRef...> [options]
```

## Description

The `add` command downloads GitHub Actions from their repositories and generates TypeScript wrapper classes with full type safety. This allows you to use GitHub Actions in your workflows with IntelliSense support and compile-time type checking.

## Arguments

- `<orgRepoRef...>` - One or more GitHub repository references (e.g., `actions/checkout@v4`, `actions/setup-node@v4`)

## Options

- `--output <outputDir>` - Output directory for generated TypeScript files (uses config default if not specified)
- `-t, --token <token>` - GitHub token (overrides env GITHUB_TOKEN)
- `--no-sha` - Use the original ref instead of resolving to SHA
- `--name <name>` - Override the action name for type names and function names (e.g., `setupNode`)

## Examples

### Add a single action

```bash
dotgithub add actions/checkout@v4
```

### Add multiple actions

```bash
dotgithub add actions/checkout@v4 actions/setup-node@v4 actions/setup-python@v5
```

### Add with custom name

```bash
dotgithub add actions/setup-node@v4 --name setupNode
```

### Add to specific output directory

```bash
dotgithub add actions/checkout@v4 --output ./custom-actions
```

### Add without SHA resolution

```bash
dotgithub add actions/checkout@v4 --no-sha
```

## What it does

1. **Downloads action metadata** - Fetches the `action.yml` file from the specified repository and ref
2. **Resolves references** - Converts version tags (like `v4`) to specific commit SHAs for reproducibility
3. **Generates TypeScript classes** - Creates type-safe wrapper classes with:
   - Input type definitions
   - Output type definitions
   - Proper method signatures
   - JSDoc documentation
4. **Updates configuration** - Adds the action to your `dotgithub.json` file
5. **Creates index files** - Generates organization-level index files for easy importing

## Generated files

For each action, the command generates:

- **Action class file** - TypeScript class extending `ActionConstruct`
- **Type definitions** - Input and output type interfaces
- **Organization index** - Aggregated exports for the organization
- **Root index** - Main exports file

## Action reference format

Actions are specified in the format: `org/repo@ref`

- `org` - GitHub organization or username
- `repo` - Repository name
- `ref` - Git reference (tag, branch, or commit SHA)

Examples:
- `actions/checkout@v4` - Latest v4 tag
- `actions/setup-node@v4.1.0` - Specific version
- `actions/checkout@main` - Latest from main branch
- `actions/checkout@abc1234` - Specific commit SHA

## TypeScript integration

Generated actions can be used in your TypeScript code:

```typescript
import { Actions } from './actions/index.js';

const { checkout, setupNode } = new Actions(stack, 'actions');

// Type-safe usage with IntelliSense
checkout('Checkout code', {
  'fetch-depth': 1,
  'submodules': 'recursive'
}).toStep();
```

## Authentication

The command requires a GitHub token for:
- Accessing private repositories
- Higher rate limits for public repositories

Set your token via:
- Environment variable: `GITHUB_TOKEN`
- Command option: `--token <token>`

## Error handling

The command will fail if:
- The repository doesn't exist
- The specified ref doesn't exist
- The repository doesn't contain a valid `action.yml`
- Network connectivity issues
- Invalid action reference format

## See also

- [dotgithub list](command-list.md) - List tracked actions
- [dotgithub remove](command-remove.md) - Remove actions
- [dotgithub update](command-update.md) - Update action versions
- [dotgithub regenerate](command-regenerate.md) - Regenerate action files
