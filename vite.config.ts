import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Backend endpoints live as Netlify Functions (netlify/functions/*.ts),
  // reached in production/`netlify dev` via the /api/* -> /.netlify/functions/:splat
  // redirect in netlify.toml. Plain `npm run dev` runs the Vite dev server on
  // its own with no such redirect, so unproxied `/api/*` calls fall through to
  // Vite's SPA fallback and return index.html instead of JSON. This proxy makes
  // `npm run dev` alone work against a locally running functions server (e.g.
  // `netlify functions:serve`, or the functionsPort a `netlify dev` process
  // exposes). It has no effect on `netlify dev` (which already proxies /api
  // itself before requests reach Vite) or on `vite build` / `vite preview`
  // (server.proxy only applies to the dev server). Override the target with
  // VITE_FUNCTIONS_PROXY_TARGET if your functions server runs elsewhere.
  const functionsTarget = env.VITE_FUNCTIONS_PROXY_TARGET || 'http://localhost:8888';

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        '/api': {
          target: functionsTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, '/.netlify/functions'),
        },
      },
    },
  };
});
