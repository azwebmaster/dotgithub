# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript monorepo that generates strongly-typed GitHub Action interfaces from action.yml files. The project consists of two main packages:

- **@dotgithub/core**: Core library for parsing GitHub Actions and generating TypeScript types
- **@dotgithub/cli**: Command-line interface that uses the core library

The project uses Bun as the primary runtime, pnpm for package management, Vitest for testing, and jsii for compiling to Python.

## Essential Commands

### Development Setup
```bash
pnpm install                    # Install all dependencies
```

### Building
```bash
pnpm -r run build              # Build all packages
bun run tsc                    # Build individual package (run from package directory)
```

### Testing
```bash
pnpm test                      # Test all packages (run from repo root)
pnpm -r run test               # Alternative: test all packages
pnpm --filter ./packages/core test    # Test only core package
pnpm --filter ./packages/cli test     # Test only CLI package
```

### CLI Usage
```bash
bun run index.ts               # Run the root index file
dotgithub add actions/checkout@v4 --output ./generated  # Generate types for GitHub Action
```

## Architecture Overview

### Core Package (`packages/core`)
The heart of the project responsible for:
- **GitHub API Integration** (`github.ts`, `git.ts`): Fetches action metadata and clones repositories
- **YAML Parsing** (`action-yml.ts`): Reads and validates action.yml files
- **Type Generation** (`typegen.ts`): Converts action schemas to TypeScript interfaces
- **Factory Functions** (`actions.ts`): Provides `createStep()` helper for creating typed workflow steps
- **Type Definitions** (`types/`): Core TypeScript interfaces for GitHub workflows and actions

Key workflow:
1. Clone GitHub repository containing the action
2. Parse `action.yml` to extract inputs, outputs, and metadata
3. Generate TypeScript interfaces with proper typing and JSDoc comments
4. Create factory functions for type-safe step creation

### CLI Package (`packages/cli`)
Simple command-line wrapper that:
- Uses Commander.js for CLI argument parsing
- Calls core library functions to generate action files
- Handles file output and error reporting

### Generated Code Pattern
The tool generates TypeScript files with:
- Typed input interfaces (with required/optional fields based on action.yml)
- Output interfaces for action results
- Factory functions that return `GitHubStep<T>` objects
- JSDoc comments with descriptions and default values

## Key Files and Their Purpose

- `packages/core/src/index.ts`: Main entry point and orchestration functions
- `packages/core/src/typegen.ts`: Core type generation logic - most edits happen here
- `packages/core/src/actions.ts`: Factory function `createStep()` for workflow steps
- `packages/core/src/types/`: TypeScript interfaces used throughout the project
- `packages/cli/src/index.ts`: CLI entry point using Commander.js

## Development Conventions

### Code Generation Patterns
- Use TypeScript AST factory methods for generating code
- Keep generator functions pure and small (under 80-120 lines)
- Extract repeated logic into helper functions with explicit types
- Use `GitHubStep` typed factories for creating workflow steps
- Add JSDoc comments to generated functions and types

### Error Handling
- Throw early on missing required fields (e.g., missing `yml.name`)
- Provide meaningful error messages to users
- Exit with proper error codes in CLI

### Testing
- Run tests after every change using `pnpm test`
- Preserve snapshot tests in `packages/core/src/__snapshots__`
- Unit test extracted helper functions

### Package Management
- Never move files across package boundaries
- Keep public package APIs stable
- Use workspace dependencies (`workspace:*`) for internal packages

## Important Constraints

1. **jsii Compatibility**: The project compiles to Python using jsii - avoid breaking public API shapes
2. **Package Boundaries**: Never move files between packages without explicit approval
3. **Monorepo Structure**: Maintain the workspace structure and dependencies
4. **Type Safety**: All generated code should be strongly typed

## Common Tasks

- **Adding new GitHub Action support**: Modify `typegen.ts` to handle new input/output patterns
- **Improving type generation**: Extract helpers in `typegen.ts` for repeated AST node creation
- **CLI enhancements**: Add new commands or options in `packages/cli/src/index.ts`
- **Testing changes**: Always run the full test suite before committing changes