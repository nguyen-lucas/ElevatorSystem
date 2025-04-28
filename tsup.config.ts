import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/redoc.ts'], // Main entry point from your tsconfig
  format: ['esm'], // Keep CommonJS to match your current setup
  dts: true, // Generate declaration files
  outDir: 'dist', // Match your tsconfig's outDir
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'esnext', // Match your tsconfig's ES version
});
