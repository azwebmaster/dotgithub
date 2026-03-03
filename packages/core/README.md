# @dotgithub/core

Type-safe core library for generating GitHub Actions workflows with DotGitHub constructs.

## What this package is

`@dotgithub/core` is the programmatic engine behind DotGitHub. It provides:

- strongly typed workflow models
- construct primitives for jobs/workflows/shared workflows
- generation/synthesis helpers for writing `.github/workflows/*.yml`

If you want to build reusable workflow logic in code, this is the package you use.

## Install

```bash
npm install @dotgithub/core
```

## Quick example

```ts
import { createWorkflow } from '@dotgithub/core';

const workflow = createWorkflow({
  on: {
    push: { branches: ['main'] },
  },
  jobs: {
    test: {
      'runs-on': 'ubuntu-latest',
      steps: [
        { uses: 'actions/checkout@v4' },
        { run: 'npm ci' },
        { run: 'npm test' },
      ],
    },
  },
});

// synthesize with your DotGitHub pipeline
```

## When to use `@dotgithub/core` vs `@dotgithub/cli`

- Use **`@dotgithub/core`** for library/SDK style usage in code.
- Use **`@dotgithub/cli`** when you want command-driven setup and synthesis.

## Docs

- Main docs: <https://github.com/azwebmaster/dotgithub#readme>
- Guides: <https://github.com/azwebmaster/dotgithub/tree/main/docs>
- API/reference context: <https://github.com/azwebmaster/dotgithub/tree/main/packages/core>

## Repository

- Source: <https://github.com/azwebmaster/dotgithub>
- Issues: <https://github.com/azwebmaster/dotgithub/issues>
