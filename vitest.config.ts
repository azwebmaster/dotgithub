import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['packages/**/src/**/*.test.{ts,tsx,js,jsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.{ts,tsx,js,jsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
    // Enable test isolation for better reliability
    isolate: true,
    // Set up test timeout
    testTimeout: 10000,
    // Enable file watching in development
    watch: process.env.NODE_ENV !== 'test',
  },
  // Resolve workspace packages
  resolve: {
    alias: {
      '@dotgithub/cli': '/packages/cli/src',
      '@dotgithub/core': '/packages/core/src',
    },
  },
});
