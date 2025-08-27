import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.{ts,tsx,js,jsx}'],
    coverage: {
      provider: 'v8',
    },
  },
});
