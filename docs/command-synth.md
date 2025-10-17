# dotgithub synth

Synthesize GitHub workflows from configured stacks and plugins.

## Synopsis

```bash
dotgithub synth [options]
```

## Description

The `synth` command generates actual GitHub workflow files (`.yml`) from your TypeScript code and plugin configurations. This is the final step that converts your abstract workflow definitions into concrete GitHub Actions workflows.

## Options

- `--dry-run` - Preview files without writing them to disk
- `--output <dir>` - Output directory (default: config outputDir relative to config file)
- `--stack <name>` - Synthesize only the specified stack
- `--verbose` - Show detailed output

## Examples

### Basic synthesis

```bash
dotgithub synth
```

Generates all configured workflows to the default output directory.

### Dry run to preview

```bash
dotgithub synth --dry-run
```

Shows what would be generated without writing files.

### Custom output directory

```bash
dotgithub synth --output ./workflows
```

Generates workflows to a custom directory.

### Synthesize specific stack

```bash
dotgithub synth --stack ci
```

Only generates workflows for the "ci" stack.

### Verbose output

```bash
dotgithub synth --verbose
```

Shows detailed information about plugin execution and file generation.

## How it works

1. **Loads configuration** - Reads `dotgithub.json` and validates settings
2. **Loads plugins** - Imports and initializes configured plugins
3. **Executes stacks** - Runs each stack's plugins to generate workflow content
4. **Writes files** - Outputs the generated `.yml` files to the target directory
5. **Reports results** - Shows summary of generated files and any errors

## Output structure

Generated workflows are organized as:

```
.github/
├── workflows/
│   ├── ci.yml
│   ├── deploy.yml
│   └── release.yml
└── dotgithub.json
```

## Stack execution

Each stack in your configuration:

1. Loads its configured plugins
2. Validates plugin configurations
3. Executes the plugin's `synthesize` method
4. Collects generated workflow files
5. Writes files to the output directory

## Plugin integration

Plugins generate workflows by:

- Creating `WorkflowConstruct` instances
- Adding jobs with `JobConstruct`
- Using type-safe action wrappers
- Defining triggers and conditions

Example plugin synthesis:

```typescript
async synthesize(stack: GitHubStack): Promise<void> {
  const wf = new WorkflowConstruct(stack, 'ci', {
    name: 'CI Workflow',
    on: { push: { branches: ['main'] } },
    jobs: {}
  });

  new JobConstruct(wf, 'test', {
    'runs-on': 'ubuntu-latest',
    steps: [
      checkout('Checkout').toStep(),
      setupNode('Setup Node').toStep(),
      run('Test', 'npm test')
    ]
  });
}
```

## Dry run mode

Use `--dry-run` to:

- Preview generated files without writing
- Validate your configuration
- Debug plugin issues
- See file structure before committing

Dry run output shows:

- Files that would be written
- File contents (truncated)
- Plugin execution results
- Any errors or warnings

## Error handling

The command will fail if:

- Configuration file is invalid
- Plugins fail to load
- Plugin synthesis errors occur
- Output directory cannot be created
- File write permissions are insufficient

## Performance

Synthesis performance depends on:

- Number of configured stacks
- Plugin complexity
- Network operations (if any)
- File I/O operations

Use `--stack` to synthesize only specific stacks for faster iteration.

## Best practices

1. **Use dry run first** - Always preview changes with `--dry-run`
2. **Incremental development** - Use `--stack` for focused testing
3. **Version control** - Commit generated workflows to your repository
4. **CI integration** - Run synthesis in your CI pipeline
5. **Plugin testing** - Test plugins individually before combining

## See also

- [dotgithub init](command-init.md) - Initialize a new project
- [dotgithub plugin](command-plugin.md) - Manage plugins and stacks
- [Plugin Development Guide](plugin-development.md) - Creating custom plugins
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
