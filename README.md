
# dotgithub Monorepo

This is a monorepo for TypeScript packages using [Bun](https://bun.sh) as the primary runtime and package manager, [Vitest](https://vitest.dev/) for testing (managed centrally from the repo root, pinned to ^3.2.4), and [jsii](https://github.com/aws/jsii) to compile packages to Python.

## Packages

- `@dotgithub/cli` — CLI utilities
- `@dotgithub/core` — Core logic

## Getting Started

Install dependencies (using bun):

```bash
bun install
```

## Scripts

Build all packages:

```bash
bun run build
```

Test all packages (run from the repo root):

```bash
bun test
```

## Using Bun

You can use Bun to run scripts as well:

```bash
bun run index.ts
```

## Compiling to Python

Each package is configured with jsii to compile to Python. See the `jsii` section in each package's `package.json` for details.

---
This project pins Vitest centrally at ^3.2.4 for consistent test runs across all packages.
