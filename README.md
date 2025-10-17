# DotGitHub

A powerful TypeScript framework for managing GitHub Actions workflows and configurations. DotGitHub provides a type-safe, plugin-based approach to generating and managing GitHub Actions, making it easier to maintain complex CI/CD pipelines.

## Features

- 🚀 **Type-Safe Actions**: Generate TypeScript wrappers for GitHub Actions with full type safety
- 🔌 **Plugin System**: Extensible plugin architecture for custom workflow generation
- 📦 **Action Management**: Automatically download and manage GitHub Actions with version pinning
- 🏗️ **Workflow Synthesis**: Generate complete GitHub workflows from TypeScript code
- 🎯 **Configuration-Driven**: Declarative configuration for actions, plugins, and stacks
- 🔄 **Auto-Generation**: Automatically generate action types and workflow files

## Quick Start

### Installation

```bash
# Install globally
npm install -g @dotgithub/cli

# Or use with npx
npx @dotgithub/cli
```

### Initialize a Project

```bash
# Initialize a new DotGitHub project
dotgithub init

# Or specify a custom directory
dotgithub init --output ./my-workflows
```

### Add GitHub Actions

```bash
# Add a specific action
dotgithub add actions/checkout@v4

# Add multiple actions
dotgithub add actions/setup-node@v4 actions/setup-python@v5
```

### Generate Workflows

```bash
# Synthesize workflows from your TypeScript code
dotgithub synth
```

## Basic Usage

1. **Initialize** your project with `dotgithub init`
2. **Configure** actions in `dotgithub.json`
3. **Write** your workflow logic in TypeScript
4. **Synthesize** workflows with `dotgithub synth`

## Documentation

- 📖 [Installation Guide](docs/installation.md)
- 🚀 [Getting Started](docs/getting-started.md)
- 📚 [User Guide](docs/user-guide.md)
- 🔧 [API Reference](docs/api-reference.md)
- 🔌 [Plugin Development](docs/plugin-development.md)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

MIT License - see [LICENSE](LICENSE) file for details.
