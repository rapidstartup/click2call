# click2call

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/rapidstartup/click2call)

## Local development

All backend endpoints (`/api/widgets`, `/api/billing`, `/api/vapi-assistants`, `/api/vapi-provision`,
`/api/stripe-checkout`, ...) are Netlify Functions in `netlify/functions/`. `netlify.toml` redirects
`/api/*` to `/.netlify/functions/:splat`, but that redirect only exists inside Netlify's own dev proxy
and in production — it is **not** something Vite knows about.

That means:

- **`npx netlify dev`** — the intended way to run this app locally. It starts Vite (`npm run dev`) and a
  local Functions server together, and applies the `netlify.toml` redirects in front of both, so
  `/api/*` reaches a real function. Requires the Netlify CLI (`npm i -g netlify-cli` or use `npx`).
- **`npm run dev` alone** — runs only the Vite dev server, with no functions server and no redirect. A
  request to `/api/widgets` falls through to Vite's SPA fallback and gets back `index.html` instead of
  JSON, which used to surface as `Unexpected token '<', "<!doctype "... is not valid JSON`. `vite.config.ts`
  now proxies `/api/*` to a local Netlify Functions server (default `http://localhost:8888`, the same
  port `netlify dev` exposes) and rewrites it to `/.netlify/functions/*`, so `npm run dev` works too as
  long as a functions server is running on that port (e.g. a `netlify dev` process, or
  `netlify functions:serve`). Override the target with `VITE_FUNCTIONS_PROXY_TARGET` if it runs elsewhere.
  This proxy only affects the Vite dev server — it has no effect on `netlify dev` (whose own proxy already
  handles `/api/*` before requests reach Vite) or on `npm run build` / `vite preview`.

Either way, every `/api` call in the app goes through `src/lib/fetchJson.ts` (`fetchJson` /
`authenticatedFetchJson`), which checks the response status and `content-type` before parsing JSON. If a
request can't reach a real API handler — backend down, wrong port, no functions server — it throws a
typed `ApiError` with a clear message ("Couldn't reach the API — is the backend running?") instead of a
raw JSON-parsing exception.