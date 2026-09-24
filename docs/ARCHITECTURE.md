# Kandrop — Architecture

## Layers

```
Browser ──► proxy.ts (locale negotiation, pages only)
   │
   ├─► src/app/[locale]/…      Pages (RSC + client islands), all text via next-intl
   │
   └─► src/app/api/…           Thin route handlers (HTTP only)
            │  requireSession()  ── auth boundary
            ▼
        src/server/modules/<domain>/{schema,service}.ts   Business logic + Zod contracts
            │
            ▼
        (future) database / payment providers / webhooks
                          │ publish
                          ▼
                  src/server/realtime/eventBus.ts ──► sse.ts ──► /api/dashboard/stream ──► EventSource
```

## Rules

1. **Routes are thin.** Parse → `requireSession` → call a `service` → `json()`. No logic in `route.ts`.
2. **Schemas are contracts.** `modules/*/schema.ts` (Zod) are shared by server and client types.
3. **API returns codes, not prose.** Errors are `{ error: { code } }`; the UI maps `code` → `Errors.<code>`.
4. **Money is integer minor units** + currency code. Format only in the UI with `Intl`.
5. **No hardcoded UI text.** Add keys to `messages/pt.json` (source of truth, type-checked), then `en`/`fr`.
   `npm run i18n:check` fails if catalogues diverge.

## API surface

| Route | Purpose |
| --- | --- |
| `GET /api/me` | Authenticated user + preferred locale |
| `GET /api/store` | Current merchant store |
| `GET /api/dashboard/summary` | Snapshot (first paint / fallback) |
| `GET /api/dashboard/stream` | SSE — live `dashboard.summary` events |
| `GET /api/health` | Liveness |

## Real-time: why SSE first

The dashboard is server → client only. SSE gives automatic reconnect, works over plain HTTP/2
and proxies, and fits Next.js route handlers. Next.js cannot host WebSocket upgrades in route
handlers, so WebSockets would require a separate server. If bidirectional needs appear later,
add a standalone WS service that consumes the same event bus contract.

**Scaling:** the bus is in-process. Before running >1 instance, swap the `EventBus` internals for
Redis/NATS pub/sub — `publish`/`subscribe` signatures stay the same. Also deploy on a Node
runtime that allows long-lived responses (not serverless functions with short timeouts).

## Status

Stubbed and to be implemented: real session verification (`server/auth/session.ts`), persistence,
real aggregations in `dashboard/service.ts`, real event producers (payment webhooks).
