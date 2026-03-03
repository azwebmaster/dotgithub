# @dotgithub/cli

CLI for scaffolding, managing, and synthesizing DotGitHub workflows from TypeScript definitions.

## Install

```bash
npm install -g @dotgithub/cli
```

Or run without installing globally:

```bash
npx @dotgithub/cli --help
```

## Commands (quick overview)

```bash
# Initialize DotGitHub config/files
dotgithub init

# Add action and generate TypeScript wrapper/types for it
dotgithub add actions/checkout@v4

# Generate workflow files
dotgithub synth
```

Aliases:

```bash
dgh --help
dotgithub --help
```

## Typical TypeScript workflow

1. `dotgithub init`
2. `dotgithub add <org/repo@version>` (downloads metadata and generates TypeScript action wrappers)
3. author/update your workflow constructs in **TypeScript**
4. `dotgithub synth` to generate YAML
5. commit generated workflow files

## Docs

- Main docs: <https://github.com/azwebmaster/dotgithub#readme>
- Guides: <https://github.com/azwebmaster/dotgithub/tree/main/docs>
- CLI source/context: <https://github.com/azwebmaster/dotgithub/tree/main/packages/cli>

## Repository

- Source: <https://github.com/azwebmaster/dotgithub>
- Issues: <https://github.com/azwebmaster/dotgithub/issues>
