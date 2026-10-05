import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/entry.ts'),
      name: 'H5PMultiChoice',
      formats: ['iife'],
      fileName: () => 'multichoice.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['./tests/setup/dom.ts'],
    globals: true,
  },
});
