# Deploying Kandrop

Status of this document: written when the functional foundation was finished. It says what is
ready to run in production, what is **not**, and how to run it.

## Read this first: it is not ready for real customers

The project builds and runs in production mode, but four things make a public launch unsafe until
they are done. None of them is a build problem; they are unfinished product.

1. **No database.** (Supabase clients exist in `src/lib/supabase`, but nothing uses them yet.) Users, stores, products, orders, payments, deliveries, plans… live in memory
   (`globalThis` maps, marked `STUB` in each `repository.ts`). A restart loses everything, and a
   second instance (or a serverless platform, where every request may hit a different process)
   sees different data. Until the repositories are replaced by a database, run **exactly one
   long-running Node process** (a VM, a container, a single Fly/Render/Railway instance) — **not**
   Vercel-style serverless functions.
2. **No real payments.** `PAYMENTS_MODE=sandbox` simulates Multicaixa Express, Unitel Money and
   cards; `live` is refused because no provider is integrated. In production a shopper would see
   "Payment complete" and nobody would be charged. Do not put real shops on it.
3. **No legal pages or consent.** There are no Terms of Service, no Privacy Policy and no consent
   checkbox at registration (Angolan data-protection rules apply). Receipts say they are not
   fiscal invoices; certified invoicing (AGT, IVA, NIF) is not implemented. Plan prices and the
   affiliate rate are placeholders.
4. **Simulated modules.** WhatsApp connection, courier network, delivery photos, reviews, course
   videos are all simulated or placeholders and are labelled so in the UI (see each section of
   `ARCHITECTURE.md`, "Before this becomes real").

## Environment variables

All are read in `src/server/config/env.ts` (validated on the first request, not at build, so
`next build` needs none). Documented, with comments, in `.env.example`.

| Variable                                                     | Production                         | Purpose                                                                       |
| ------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------- |
| `SESSION_SECRET`                                             | **required** (≥ 32 chars)          | Signs session JWTs. Without it the app refuses requests in production.        |
| `APP_URL`                                                    | recommended                        | Public base URL (no trailing slash). Webhook callback and server-built links. |
| `PAYMENTS_MODE`                                              | `sandbox` (only option that works) | `live` is refused until a provider exists.                                    |
| `MULTICAIXA_WEBHOOK_SECRET`                                  | recommended (≥ 32 chars)           | Signs the webhook. Empty = random per process (one instance only).            |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | not used yet                       | Supabase project URL and public anon key (`src/lib/supabase`).                |
| `SUPABASE_SERVICE_ROLE_KEY`                                  | not used yet                       | **Secret**, bypasses RLS, server only.                                        |
| `PORT`                                                       | optional                           | Listening port (default 3000).                                                |
| `AUTH_DEV_BYPASS`                                            | must be `false`                    | The app throws at start-up in production if true.                             |
| `KANDROP_DEMO_EVENTS`                                        | `false`                            | `true` seeds demo data into every store; a warning is logged.                 |

There is no separate "API URL": the API is the same app under `/api`. The only outbound callback
is the sandbox Multicaixa webhook (`APP_URL` + `/api/webhooks/multicaixa`).

## Build and run

```bash
npm ci
npm run check        # i18n parity + tsc + eslint
npm run build
SESSION_SECRET=… APP_URL=https://… npm start     # next start, NODE_ENV=production
```

**Run the build from the project folder** (the one with `next.config.ts` and `src/`). On a hosting
platform, set its _Root Directory_ / working directory to that folder. Launched from anywhere else,
`next build` fails with `[next-intl] Could not find i18n config at ./src/i18n/request.ts`: the plugin
resolves that relative path from where the command runs (`src/i18n/request.ts` itself is fine).

Node ≥ 20.9. Health check: `GET /api/health` → `{"status":"ok"}`.

## Behind a reverse proxy / platform

- Terminate TLS and add **HSTS** there. The session cookie is `Secure` in production, so it only
  works over HTTPS (browsers accept it on `http://localhost`).
- The proxy **must overwrite** `X-Forwarded-For` and `X-Forwarded-Host`: the rate limiter and the
  CSRF origin check trust them. Exposed directly to the internet, both can be spoofed.
- Do not buffer or compress `/api/dashboard/stream` (server-sent events); the app already sends
  `Cache-Control: no-cache, no-transform` and `X-Accel-Buffering: no`.
- The app sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` and
  `Permissions-Policy` itself. A Content-Security-Policy is not set (Next's inline scripts need a
  nonce-based policy): add one at the proxy or in a follow-up.
- Rate limiting is in memory, per process (`server/http/rateLimit.ts`): fine for one instance.

## Smoke test after a deploy

1. `GET /api/health` is `ok`.
2. Register, log in, open every menu item; nothing 500s (the logs would show `[api] unhandled error`).
3. Create a product, open its public page (`/pt/loja/<slug>`), press "Buy now", pay in the sandbox
   with `9xxxxxxxx` (Multicaixa confirms after 5–10 s through the signed webhook, so `APP_URL` must
   be reachable from the server itself).
4. The logs show no `[env]` warning you did not expect.
