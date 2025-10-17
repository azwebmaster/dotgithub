# dotgithub init

Initialize a new GitHub Actions workspace with TypeScript and ESM support.

## Synopsis

```bash
dotgithub init [options]
```

## Description

The `init` command sets up a new DotGitHub project by creating the necessary directory structure, configuration files, and TypeScript setup. This is typically the first command you run when starting a new project.

## Options

- `--force` - Overwrite existing files if they exist
- `--output <dir>` - Output directory for the workspace (default: `src`)

## What it creates

The `init` command creates the following files and directories:

1. **Configuration file**: `dotgithub.json` in the output directory
2. **Workspace directory**: A subdirectory (default: `src`) containing:
   - `package.json` - Node.js package configuration with TypeScript support
   - `tsconfig.json` - TypeScript compiler configuration
   - `index.ts` - Basic entry point file

## Examples

### Basic initialization

```bash
dotgithub init
```

This creates a `src/` directory with all necessary files.

### Custom output directory

```bash
dotgithub init --output ./my-workflows
```

This creates a `my-workflows/` directory instead of `src/`.

### Force overwrite existing files

```bash
dotgithub init --force
```

This will overwrite any existing files in the target directory.

## Generated files

### dotgithub.json

The main configuration file that tracks:
- Actions to generate
- Plugin configurations
- Stack definitions
- Output settings

### package.json

A Node.js package file with:
- TypeScript dependencies
- Build scripts
- DotGitHub core dependencies

### tsconfig.json

TypeScript configuration optimized for:
- ES2022 target
- ESNext modules
- Strict type checking
- Source maps and declarations

### index.ts

A basic entry point that imports the DotGitHub core library.

## Next steps

After running `init`, you typically:

1. Navigate to the workspace directory: `cd src`
2. Install dependencies: `npm install`
3. Add GitHub Actions: `dotgithub add actions/checkout@v4`
4. Write your workflow logic in TypeScript
5. Synthesize workflows: `dotgithub synth`

## Error handling

The command will fail if:
- Files already exist and `--force` is not specified
- The output directory cannot be created
- There are permission issues writing files

## See also

- [dotgithub add](command-add.md) - Add GitHub Actions to your project
- [dotgithub synth](command-synth.md) - Generate workflow files
- [Configuration Guide](configuration.md) - Understanding dotgithub.json
