
# Copilot Agent Instructions for azwebmaster/dotgithub

> This file is for LLM coding agents working in the azwebmaster/dotgithub repo. Follow these instructions exactly to ensure correct, efficient, and safe automation.

## Table of Contents
- Quick Reference
- Project Overview
- Developer Workflows
- Code Generation Patterns
- Error Handling & Testing
- What NOT to Change
- Troubleshooting & External Docs

---

## Quick Reference

- **Install dependencies:** `bun install`
- **Build all packages:** `bun run build`
- **Test all packages:** `bun test`
- **Test core only:** `bun --filter ./packages/core test`
- **Edit only within `packages/*`, never move files across package boundaries.**
- **Extract helpers for repeated logic, place in `src/typegen-helpers.ts`.**
- **Run tests after every change.**

---

<!-- Project-specific Copilot instructions for azwebmaster/dotgithub -->

This file gives actionable, repository-specific guidance to AI coding agents so they can be productive quickly.

- **Repo type:** TypeScript monorepo
- **Package manager:** `bun` (workspace root)
- **Runtime:** `Bun` is used in development tooling; Node-compatible code expected
- **Test framework:** `vitest` (per-package `vitest.config.ts`)
- **Packages:** `packages/core`, `packages/cli`
- **Notable tooling:** `jsii` configs exist (Python target), `tsc`/`tsconfig.json` at repo and package levels

Quick goals for the agent
- Apply minimal, focused edits; prefer small, testable changes inside `packages/*`.
- Preserve build/test commands and package boundaries; do not move files across packages.
- Keep public package APIs stable (exports in `packages/*/package.json`).

High-level architecture (how things fit together)
- `packages/core`: Library code for generating and working with GitHub workflow/action types and helpers.
  - Key files: `src/typegen.ts`, `src/actions.ts`, `src/github.ts`, `src/utils.ts`.
  - Responsibilities: parse action/workflow YAML, produce typed factories, and expose core domain types (`types/`).
- `packages/cli`: CLI glue that depends on `core` for runtime operations (see `packages/cli/src/index.ts`).

Developer workflows & commands (use these exactly)
- Install dependencies (root):
```bash
bun install
```
- Build all packages:
```bash
bun run build
```
- Run tests for all packages:
```bash
bun test
```
- Run a single package's tests (example for core):
```bash
bun --filter ./packages/core test
```
- Run TypeScript diagnostics on a file (agent action): use the project's `get_errors` tool or `tsc` via workspace scripts. Prefer diagnostics API when available.

Project-specific conventions and patterns
- Prefer AST-based code generation using the TypeScript `ts.factory` API for codegen (see `packages/core/src/typegen.ts`). Keep generator functions pure and small.
- Use `GitHubStep` / `Partial<GitHubStep>` typed factories for creating workflow steps; functions typically return `GitHubStep` typed nodes.
- Add synthetic leading comments for generated functions and types to preserve JSDoc-like metadata used by consumers.
- Defaults merging pattern: create an `inputsWithDefaults` const that spreads provided `inputs` over literals for defaults (see `typegen.ts`).
- Error handling: throw early on missing required fields (e.g., `yml.name`) rather than returning partial values.

TypeScript: reduce duplication & keep functions small
- When you see repeated logic (e.g., creating AST nodes for inputs/outputs or literal conversion), extract a small, well-typed helper function in the same file or a nearby `*-helpers.ts` file. Example: split `typegen.ts` into helpers for `createLiteralFromValue`, `buildInputMembers`, `createInputsWithDefaultsDecl`.
- Prefer pure functions with explicit input/output types. This makes unit testing straightforward and avoids hidden state.
- Keep functions under ~80-120 lines where practical. If a function is growing, identify 2–4 coherent sub-steps and extract them as helpers with descriptive names.
- Use TypeScript types (not `any`) for helper function signatures. If you must accept unknown shapes, use a narrow union or a small interface from `packages/core/src/types`.
- Replace duplicated object/AST creation with a single factory helper that accepts configuration (e.g., `makeProperty(name, required, description)`), then call it from multiple places.
- When refactoring, run or update snapshot tests in `packages/core/src/__snapshots__` to ensure generated output remains stable.
- Document extracted helpers with a one-line comment showing the intent and the files that use them.

Quick refactor checklist for AI agents
- Find repeated patterns (search for `createPropertySignature`, `createStringLiteral`, `createObjectLiteralExpression`).
- Extract a helper with a typed signature and unit tests in the same package.
- Replace call sites and run `bun --filter ./packages/core test`.
- If snapshots change, update them only after confirming intended behaviour.


Integration points & external dependencies
- `jsii.config.ts` files indicate `jsii` usage for multi-language bindings (Python). Avoid breaking public shape expected by `jsii`.
- Actions YAML parsing and codegen flows are internal to `core` and surfaced to `cli` when needed.
- Be conservative when editing types that are exported from `packages/core/src/types`—these are relied on by other packages and external consumers.

Editing and testing guidance for agents
- When making changes:
  - Run the package's unit tests locally (`bun --filter ./packages/core test`).
  - Run the root test command if a change affects multiple packages.
  - If you change exported types, update `packages/*/package.json` `types` fields only when intentional.
- If a change touches codegen (`typegen.ts`):
  - Preserve existing snapshot tests in `packages/core/src/__snapshots__` if present.
  - Prefer extracting small helper functions (pure) for testability.

Files to inspect for context when editing
- `packages/core/src/typegen.ts` — generator logic; frequent edits go here
- `packages/core/src/types` — canonical types used across packages
- `packages/core/vitest.config.ts` & `vitest.config.ts` (root) — test setup and global fixtures
- `package.json` (root) & `packages/*/package.json` — scripts, build/test commands, and exported entry points

When merging existing `.github/copilot-instructions.md` content
- Preserve any checked items that are still valid (like high-level goals). Replace stale scaffolding steps with the project's exact commands above.

What NOT to change without explicit user approval
- Do not rename packages or move files across `packages/` boundaries.
- Do not alter `jsii` configuration or package export shapes unless asked.

If something is unclear
- Ask the user for these specifics before making broad changes:
  - Should new helper functions be extracted into their own module? (default: yes for testability)
  - Are breaking type changes acceptable? (default: no)

End of agent-specific guidance. Reply with suggested edits if you want this merged or further trimmed.
