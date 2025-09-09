export * from './types';
export * from './manager';
export * from './resolver';
export * from './built-in';

// Export built-in plugins registry
import { ciPlugin } from './built-in/ci-plugin';
import { releasePlugin } from './built-in/release-plugin';

export const BUILT_IN_PLUGINS = {
  'ci': ciPlugin,
  'release': releasePlugin
} as const;