# Vitest Monorepo Setup Guide

This guide explains how to set up and use Vitest in a monorepo environment.

## Overview

Your monorepo is configured with:
- **Root-level Vitest config**: Runs all tests across packages
- **Package-level configs**: Individual package test configurations
- **Workspace integration**: Uses Bun workspaces for dependency management

## Configuration Structure

```
├── vitest.config.ts              # Root config (runs all tests)
├── packages/
│   ├── cli/
│   │   ├── vitest.config.ts      # CLI-specific config
│   │   └── src/**/*.test.ts      # CLI tests
│   └── core/
│       ├── vitest.config.ts      # Core-specific config
│       └── src/**/*.test.ts      # Core tests
```

## Available Scripts

### Root Level Commands

```bash
# Run all tests once
bun test

# Run tests in watch mode
bun test:watch

# Run tests with UI (requires @vitest/ui)
bun test:ui

# Run tests with coverage
bun test:coverage

# Run tests for changed files only
bun test:changed

# Run tests in each package individually
bun test:packages
```

### Package Level Commands

```bash
# Run tests for specific package
cd packages/cli && bun test
cd packages/core && bun test
```

## Key Features

### 1. **Test Discovery**
- Automatically finds all `*.test.{ts,tsx,js,jsx}` files in `packages/*/src/`
- Excludes `node_modules` and `dist` directories

### 2. **Coverage Reporting**
- Generates coverage for all packages
- Excludes test files and build artifacts
- Outputs to `./coverage` directory

### 3. **Workspace Integration**
- Resolves workspace packages with aliases
- CLI package can import from Core package directly
- Uses Bun's workspace dependency resolution

### 4. **CI/CD Integration**
- GitHub Actions reporter for CI environments
- Proper test isolation for reliability
- Configurable timeouts

## Best Practices

### 1. **Test Organization**
```
src/
├── components/
│   ├── Button.ts
│   └── Button.test.ts
├── utils/
│   ├── helpers.ts
│   └── helpers.test.ts
└── __tests__/          # Alternative: dedicated test directory
    └── integration.test.ts
```

### 2. **Import Aliases**
Use workspace aliases in your tests:
```typescript
// In packages/cli/src/commands/add.test.ts
import { someFunction } from '@dotgithub/core';
```

### 3. **Test Isolation**
- Each test runs in isolation by default
- Use `beforeEach`/`afterEach` for cleanup
- Mock external dependencies when needed

### 4. **Performance**
- Use `test.only()` for focused testing during development
- Use `test.skip()` to temporarily disable tests
- Run `bun test:changed` for faster feedback on changes

## Advanced Configuration

### Custom Test Environments
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node', // or 'jsdom' for DOM testing
    // Custom setup files
    setupFiles: ['./test-setup.ts'],
  },
});
```

### Parallel Testing
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Run tests in parallel (default)
    pool: 'threads',
    // Or run in sequence for debugging
    // pool: 'forks',
  },
});
```

### Custom Matchers
```typescript
// test-setup.ts
import { expect } from 'vitest';

expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () => `Expected ${received} to be a valid email`,
    };
  },
});
```

## Troubleshooting

### Common Issues

1. **Tests not found**
   - Check file naming: `*.test.{ts,tsx,js,jsx}`
   - Verify include patterns in config

2. **Import errors**
   - Ensure workspace aliases are configured
   - Check package.json dependencies

3. **Slow tests**
   - Use `test.only()` for focused testing
   - Consider test parallelization settings

4. **Coverage issues**
   - Verify include/exclude patterns
   - Check that source files are being instrumented

### Debug Mode
```bash
# Run with debug output
DEBUG=vitest bun test

# Run specific test file
bun test packages/cli/src/commands/add.test.ts
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Tests
  run: bun test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "bun test:changed"
    }
  }
}
```

## Migration from Other Test Runners

### From Jest
- Replace `jest` with `vitest` in imports
- Update config format (similar to Vite config)
- Most Jest APIs are compatible

### From Mocha
- Replace `describe`/`it` with `test`/`describe`
- Update assertion library imports
- Configure test environment

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Config Reference](https://vitest.dev/config/)
- [Monorepo Testing Best Practices](https://vitest.dev/guide/workspace.html)

