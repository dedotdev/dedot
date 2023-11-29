import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // @ts-ignore
  plugins: [tsconfigPaths()],
});
