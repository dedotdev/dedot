/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // @ts-ignore
  test: {
    environment: 'happy-dom',
    setupFiles: './src/setup.ts',
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
