import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false,
    minify: true,
    outDir: 'dist/server',
    rollupOptions: {
      input: 'server/worker.ts',
      output: {
        entryFileNames: 'index.js',
        format: 'es',
      },
    },
    ssr: true,
    target: 'es2022',
  },
  ssr: {
    noExternal: true,
    target: 'webworker',
  },
});
