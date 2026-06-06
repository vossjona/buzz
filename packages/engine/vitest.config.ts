// ABOUTME: Vitest configuration for the engine package.
// ABOUTME: Runs unit tests for game logic.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
