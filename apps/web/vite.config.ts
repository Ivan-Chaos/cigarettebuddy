import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { appDirFrom, loadEnv } from '@cigbuddy/env';

// apps/web/.env wins over the shared .env at the repo root. Vite's own envDir
// stays at this app, so it is also where PUBLIC_* variables are read from.
loadEnv({ appDir: appDirFrom(import.meta.url, 0) });

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: Number(process.env.WEB_DEV_PORT ?? 5173),
    strictPort: true,
    proxy: {
      // Lets the browser call /api/* on the dev server without CORS.
      '/api': {
        target: process.env.API_URL ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
