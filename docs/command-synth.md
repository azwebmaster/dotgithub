# dotgithub synth

Synthesize GitHub workflows from configured stacks and constructs.

## Synopsis

```bash
dotgithub synth [options]
```

## Description

The `synth` command generates actual GitHub workflow files (`.yml`) from your TypeScript code and construct configurations. This is the final step that converts your abstract workflow definitions into concrete GitHub Actions workflows.

## Options

- `--dry-run` - Preview files without writing them to disk
- `--build` - Run `npm run build` before synthesis
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

### Build before synthesis

```bash
dotgithub synth --build
```

Runs `npm run build` before generating workflows.

### Synthesize specific stack

```bash
dotgithub synth --stack ci
```

Only generates workflows for the "ci" stack.

### Verbose output

```bash
dotgithub synth --verbose
```

Shows detailed information about construct execution and file generation.

## How it works

1. **Loads configuration** - Reads `dotgithub.json` and validates settings
2. **Loads constructs** - Imports and initializes configured constructs
3. **Executes stacks** - Runs each stack's constructs to generate workflow content
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

1. Loads its configured constructs
2. Validates construct configurations
3. Executes each construct's `synthesize` method
4. Collects generated workflow files
5. Writes files to the output directory

## Construct integration

Constructs generate workflows by:

- Creating `WorkflowConstruct` instances
- Adding jobs with `JobConstruct`
- Using type-safe action wrappers
- Defining triggers and conditions

Example construct synthesis:

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
- Debug construct issues
- See file structure before committing

Dry run output shows:

- Files that would be written
- File contents (truncated)
- Construct execution results
- Any errors or warnings

## Error handling

The command will fail if:

- Configuration file is invalid
- Constructs fail to load
- Construct synthesis errors occur
- Output directory cannot be created
- File write permissions are insufficient

## Performance

Synthesis performance depends on:

- Number of configured stacks
- Construct complexity
- Network operations (if any)
- File I/O operations

Use `--stack` to synthesize only specific stacks for faster iteration.

## Best practices

1. **Use dry run first** - Always preview changes with `--dry-run`
2. **Incremental development** - Use `--stack` for focused testing
3. **Version control** - Commit generated workflows to your repository
4. **CI integration** - Run synthesis in your CI pipeline
5. **Construct testing** - Test constructs individually before combining

## See also

- [dotgithub init](command-init.md) - Initialize a new project
- [dotgithub construct](command-construct.md) - Manage constructs and stacks
- [Construct Development Guide](construct-development.md) - Creating custom constructs
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
