# Contributing to DotGitHub

Thank you for your interest in contributing to DotGitHub! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@dotgithub.dev](mailto:conduct@dotgithub.dev).

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0.0 or higher
- **Bun** 1.2.19 or higher (package manager)
- **Git** for version control
- **GitHub account** for contributing

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/yourusername/dotgithub.git
cd dotgithub
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/azwebmaster/dotgithub.git
```

## Development Setup

### Install Dependencies

Install all dependencies using Bun:

```bash
bun install
```

### Build the Project

Build all packages:

```bash
bun run build
```

### Run Tests

Run the test suite:

```bash
bun run test
```

Run tests in watch mode:

```bash
bun run test:watch
```

Run tests with coverage:

```bash
bun run test:coverage
```

### Development Workflow

1. **Create a branch** for your changes:

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following the [coding standards](#coding-standards)

3. **Test your changes**:

```bash
bun run test
bun run build
```

4. **Commit your changes** with a descriptive message

5. **Push to your fork**:

```bash
git push origin feature/your-feature-name
```

6. **Create a pull request** on GitHub

## Project Structure

```
dotgithub/
├── packages/                    # Monorepo packages
│   ├── cli/                    # CLI package
│   │   ├── src/
│   │   │   ├── commands/       # CLI commands
│   │   │   └── index.ts        # CLI entry point
│   │   └── package.json
│   └── core/                   # Core package
│       ├── src/
│       │   ├── constructs/     # Workflow constructs
│       │   ├── plugins/        # Plugin system
│       │   ├── types/          # Type definitions
│       │   └── index.ts        # Core entry point
│       └── package.json
├── examples/                   # Example projects
│   └── example/               # Basic example
├── docs/                      # Documentation
├── dist/                      # Built files
├── package.json              # Root package.json
└── README.md
```

### Package Structure

- **@dotgithub/cli** - Command-line interface
- **@dotgithub/core** - Core functionality and types

## Making Changes

### Coding Standards

#### TypeScript

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use strict type checking

#### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Use semicolons
- Maximum line length: 100 characters

#### File Naming

- Use kebab-case for file names
- Use PascalCase for class names
- Use camelCase for function and variable names

### Adding New Commands

1. Create a new command file in `packages/cli/src/commands/`
2. Implement the command following the existing pattern
3. Export the command from the main CLI file
4. Add tests for the command
5. Update documentation

Example command structure:

```typescript
import { Command } from 'commander';
import { DotGithubContext, logger } from '@dotgithub/core';

export function createMyCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  return new Command('my-command')
    .description('Description of what the command does')
    .option('--option <value>', 'Description of the option')
    .action(async (options) => {
      try {
        const context = createContext(options);

        // Command logic here

        logger.success('Command completed successfully');
      } catch (err) {
        logger.failure('Command failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
      }
    });
}
```

### Adding New Core Features

1. Add the feature to the appropriate package (`@dotgithub/core`)
2. Export the feature from the package's index file
3. Add TypeScript types and interfaces
4. Write comprehensive tests
5. Update documentation

### Plugin Development

When adding plugin-related features:

1. Follow the existing plugin interface
2. Add proper validation and error handling
3. Include configuration schema validation
4. Write tests for different configurations
5. Update plugin documentation

## Testing

### Test Structure

Tests are organized by package:

- `packages/cli/src/commands/*.test.ts` - CLI command tests
- `packages/core/src/**/*.test.ts` - Core functionality tests

### Writing Tests

Use Vitest for testing. Follow these patterns:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyFunction } from './my-function';

describe('MyFunction', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', () => {
    const result = MyFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle errors', () => {
    expect(() => MyFunction('invalid')).toThrow('Error message');
  });
});
```

### Test Coverage

Maintain high test coverage:

- Aim for 90%+ coverage
- Test both success and error cases
- Test edge cases and boundary conditions
- Mock external dependencies

### Running Tests

```bash
# Run all tests
bun run test

# Run tests for specific package
bun run --filter './packages/cli' test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run tests for changed files
bun run test:changed
```

## Submitting Changes

### Pull Request Process

1. **Create a descriptive title** that explains what the PR does
2. **Write a detailed description** including:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Any breaking changes
3. **Link related issues** using keywords like "Fixes #123" or "Closes #456"
4. **Ensure all tests pass** and coverage is maintained
5. **Update documentation** if needed

### Pull Request Template

```markdown
## Description

Brief description of the changes

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist

- [ ] Code follows the project's coding standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or breaking changes documented)
```

### Review Process

1. **Automated checks** must pass (tests, linting, build)
2. **Code review** by maintainers
3. **Approval** from at least one maintainer
4. **Merge** by maintainers

## Release Process

### Version Management

We use [Changesets](https://github.com/changesets/changesets) for version management:

1. **Create a changeset** for your changes:

```bash
bun run changeset
```

2. **Follow the prompts** to describe your changes
3. **Commit the changeset** file
4. **Maintainers will handle** versioning and publishing

### Release Types

- **Patch** - Bug fixes, documentation updates
- **Minor** - New features, new commands
- **Major** - Breaking changes

### Publishing

Releases are automatically published to GitHub Packages when changesets are merged to main.

## Development Tips

### Local Development

1. **Use the example project** for testing:

```bash
cd examples/example
bun install
bun run build
```

2. **Link packages locally** for testing:

```bash
bun link
cd examples/example
bun link @dotgithub/cli @dotgithub/core
```

3. **Use the CLI locally**:

```bash
bun run cli --help
```

### Debugging

1. **Use debug logging**:

```bash
bun run cli --debug your-command
```

2. **Add console.log statements** for debugging
3. **Use the browser dev tools** for debugging tests

### Performance

1. **Profile your code** for performance issues
2. **Use efficient algorithms** and data structures
3. **Minimize external API calls**
4. **Cache expensive operations**

## Getting Help

### Documentation

- [Installation Guide](docs/installation.md)
- [Getting Started](docs/getting-started.md)
- [User Guide](docs/user-guide.md)
- [API Reference](docs/api-reference.md)
- [Plugin Development](docs/plugin-development.md)

### Community

- [GitHub Discussions](https://github.com/azwebmaster/dotgithub/discussions) - Ask questions and discuss ideas
- [GitHub Issues](https://github.com/azwebmaster/dotgithub/issues) - Report bugs and request features
- [Discord](https://discord.gg/dotgithub) - Real-time chat and support

### Maintainers

- [@azwebmaster](https://github.com/azwebmaster) - Project maintainer

## License

By contributing to DotGitHub, you agree that your contributions will be licensed under the MIT License.

## Thank You

Thank you for contributing to DotGitHub! Your contributions help make the project better for everyone.
