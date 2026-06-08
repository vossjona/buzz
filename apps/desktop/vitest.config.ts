// ABOUTME: Vitest configuration for the desktop app package.
// ABOUTME: Runs unit tests for hooks and utilities.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    poolOptions: {
      forks: {
        // Node ships an experimental Web Storage implementation that shadows
        // jsdom's localStorage/sessionStorage in tests. Disable it so jsdom wins.
        execArgv: ['--no-experimental-webstorage'],
      },
    },
  },
});
