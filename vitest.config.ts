import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['packages/**/src/**/*.test.{ts,tsx,js,jsx}'],
    reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
    coverage: {
      provider: 'v8',
    },
  },
});
