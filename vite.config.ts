import tailwindcss from '@tailwindcss/postcss';
import { sites } from '@openai/sites-vite-plugin';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const sourceRoot = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig(({ mode }) => ({
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.API_PORT || loadEnv(mode, process.cwd(), 'API_').API_PORT || '8787'}`,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader(
              'X-Real-IP',
              req.socket.remoteAddress || 'unknown',
            );
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': sourceRoot,
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  plugins: [react(), sites()],
  build: {
    outDir: 'dist/client',
    sourcemap: false,
  },
}));
