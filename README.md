
# dotgithub Monorepo

This is a monorepo for TypeScript packages managed with [pnpm](https://pnpm.io/), using [Bun](https://bun.sh) as the primary runtime, [Vitest](https://vitest.dev/) for testing (managed centrally from the repo root, pinned to ^3.2.4), and [jsii](https://github.com/aws/jsii) to compile packages to Python.

## Packages

- `@dotgithub/cli` — CLI utilities
- `@dotgithub/core` — Core logic

## Getting Started

Install dependencies (using pnpm):

```bash
pnpm install
```

## Scripts

Build all packages:

```bash
pnpm -r run build
```

Test all packages (run from the repo root):

```bash
pnpm test
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
