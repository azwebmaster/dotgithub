# Copilot Instructions

This is a TypeScript monorepo that generates strongly-typed GitHub Action interfaces from action.yml files. The project creates type-safe factory functions for building GitHub workflows.

## Essential Architecture

### Monorepo Structure
- **`packages/core`**: Core library for parsing GitHub Actions and generating TypeScript types
- **`packages/cli`**: Command-line interface using Commander.js pattern
- **Root**: Centralized testing with Vitest, shared dependencies via Bun workspaces

### Key Components
- **Type Generation** (`packages/core/src/typegen.ts`): Core logic for converting GitHub Action YAML to TypeScript interfaces
- **Context Pattern** (`packages/core/src/context.ts`): `DotGithubContext` manages config, paths, and project state
- **Factory Pattern** (`packages/core/src/actions.ts`): `createStep()` function for type-safe workflow step creation
- **Plugin System** (`packages/core/src/plugins/`): Extensible plugin architecture with stack-based configuration

## Development Workflows

### Essential Commands
```bash
bun install                                    # Install dependencies
bun test                                       # Run all tests from root
bun run build                                  # Build all packages
bun --filter ./packages/core test             # Test specific package
```

### CLI Usage Pattern
```bash
dotgithub add actions/checkout@v4 --output ./generated
dotgithub init                                 # Creates .github/dotgithub.json config
dotgithub synth                                # Generate workflow YAML from TypeScript
```

## Critical Patterns

### Config-Driven Architecture
- Configuration stored in `.github/dotgithub.json` using `DotGithubConfig` interface
- Context creation pattern: `DotGithubContext.fromConfig(configPath)`
- Path resolution always relative to config file location

### Type Generation Pattern
```typescript
// Generated code follows this pattern:
export type CheckoutInputs = { repository?: string; ref?: string; };
export function checkout(inputs?: CheckoutInputs): GitHubStep<CheckoutInputs> {
  return createStep("actions/checkout", { with: inputs }, "v4");
}
```

### JSDoc Comment Escaping
When generating code, escape JSDoc comments: `text.replace(/\*\//g, '*\\/')`

### GitHub API Integration
- Uses Octokit for GitHub API calls
- Clones repositories to parse action.yml files
- Resolves git references to exact SHAs for reproducibility

## Constraints & Requirements

### jsii Compatibility
- Project compiles to Python using jsii - avoid breaking public API shapes
- Keep interfaces simple and avoid complex TypeScript features that don't translate

### Package Boundaries
- **Never move files between packages** without explicit approval
- Use `workspace:*` dependencies for internal packages
- CLI depends on core, not vice versa

### Code Generation Guidelines
- Keep generator functions under 80-120 lines
- Extract repeated logic into helper functions with explicit types
- Use TypeScript AST factory methods for code generation
- Always run `bun test` after changes to validate snapshots

## Testing & Quality

- **Snapshot tests** in `packages/core/src/__snapshots__/` for generated code
- **Vitest centrally managed** from repo root (pinned to ^3.2.4)
- **Error handling**: Throw early on missing required fields, provide meaningful messages
- **Always run tests** after modifications to core generation logic

## File Organization Patterns

- Generated TypeScript files follow kebab-case naming
- Plugin files in `packages/core/src/plugins/`
- CLI commands in `packages/cli/src/commands/`
- Type definitions centralized in `packages/core/src/types/`
- Constructs (CDK-style) in `packages/core/src/constructs/`

## Common Pitfalls

- Don't break jsii compatibility with complex TypeScript types
- Don't move files across package boundaries
- Always escape JSDoc comments in generated code
- Test changes with both unit tests and CLI integration
- Preserve snapshot test expectations when modifying generators