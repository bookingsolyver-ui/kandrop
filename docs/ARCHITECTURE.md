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

| Route                                     | Purpose                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/me`                             | Authenticated user + preferred locale                                           |
| `GET /api/store`                          | Current merchant store                                                          |
| `GET /api/dashboard/summary`              | Snapshot (first paint / fallback)                                               |
| `GET /api/dashboard/stream`               | SSE — live `dashboard.summary` events                                           |
| `GET/POST /api/products`                  | Merchant catalogue: list (search, filters, sort, paging) / create               |
| `GET/PATCH/DELETE /api/products/:id`      | One product                                                                     |
| `GET /api/products/:id/images/:imageId`   | A product image (its own merchant only)                                         |
| `GET /api/orders`                         | Merchant orders: search, status filter, sort, paging, per-status counts         |
| `GET/PATCH /api/orders/:id`               | One order / move it along the fulfilment flow                                   |
| `GET/PUT /api/settings/bank`              | The store's payout account (masked on read; changing it re-checks the password) |
| `GET/POST /api/payouts`                   | Payout history + withdrawable balance / request a payout                        |
| `GET /api/automations`                    | WhatsApp connection + the three automation flows                                |
| `POST/DELETE /api/automations/connection` | Start pairing a number (simulated) / cancel or disconnect                       |
| `PATCH /api/automations/flows/:key`       | Switch a flow, edit its message, or restore the default                         |
| `GET /api/health`                         | Liveness                                                                        |

## Real-time: why SSE first

The dashboard is server → client only. SSE gives automatic reconnect, works over plain HTTP/2
and proxies, and fits Next.js route handlers. Next.js cannot host WebSocket upgrades in route
handlers, so WebSockets would require a separate server. If bidirectional needs appear later,
add a standalone WS service that consumes the same event bus contract.

**Scaling:** the bus is in-process. Before running >1 instance, swap the `EventBus` internals for
Redis/NATS pub/sub — `publish`/`subscribe` signatures stay the same. Also deploy on a Node
runtime that allows long-lived responses (not serverless functions with short timeouts).

## Merchant dashboard (`/[locale]/dashboard`)

- **Contract:** `DashboardSummary` in `server/modules/dashboard/schema.ts` — four KPIs (gross revenue,
  net revenue + margin, pending orders, withdrawable balance), a 14-day revenue series and top products.
  The same shape is returned by `GET /api/dashboard/summary` and pushed on the stream as the
  `dashboard.summary` event, so the UI never merges partial deltas.
- **Client:** `components/dashboard/useDashboardLive.ts` is the only place that knows the transport
  (snapshot fetch + `EventSource`). Swapping SSE for a WebSocket gateway means changing that hook only.
- **Demo data:** with `KANDROP_DEMO_EVENTS=true` (dev only) `simulator.ts` behaves like a live store:
  orders arrive, get delivered and settle into the balance. Without it the API returns an empty summary.
- **Chart:** hand-built SVG (`RevenueChart.tsx`) — no chart dependency. Series colours are tokens in
  `globals.css`, checked with the dataviz palette validator in light and dark. A visually-hidden table
  exposes every plotted value.

## Authentication (`/api/auth/*`, `/[locale]/login`, `/[locale]/register`)

| Route                     | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `POST /api/auth/register` | Create account + store, then sign in (201) |
| `POST /api/auth/login`    | Verify credentials, sign in                |
| `POST /api/auth/logout`   | Clear the session cookie                   |

- **Session = JWT (HS256, `jose`)** with `sub` (user), `sto` (store), `role`, `iss`, `aud`, `jti`, 8h expiry
  (`server/auth/jwt.ts`). It is delivered in an **httpOnly, SameSite=Lax cookie** (`Secure` in production),
  so page scripts — and therefore XSS — can never read it. The token is deliberately _not_ returned in the
  response body. `requireSession` also accepts `Authorization: Bearer <jwt>` for non-browser clients.
- **One gate:** every protected route calls `requireSession(req)`; pages call `readSession()`. Verification
  pins the algorithm, issuer and audience; anything invalid is simply "no session".
- **Passwords:** scrypt (N=2^15, r=8, p=3, per-hash salt, parameters stored in the hash) with constant-time
  comparison. Unknown e-mails burn an equal-cost hash so response time does not reveal which addresses exist.
- **Brute force:** 5 failed attempts per (IP, e-mail) and 20 per IP per 15 min → `429` + `Retry-After`.
  In-memory (`server/http/rateLimit.ts`); use Redis before running more than one instance. `X-Forwarded-For`
  is only trustworthy behind a proxy that overwrites it.
- **CSRF:** SameSite=Lax + an `Origin` check on every cookie-authenticated POST (`assertSameOrigin`).
- **Validation:** one Zod schema set (`shared/auth/schemas.ts`) runs in the browser for instant feedback and
  on the server as the real gate. Messages are **codes**; the UI translates `Auth.validation.<code>`.
  Password policy: 10–128 chars, letters + numbers, not a common password, must not contain the e-mail.
- **Form UX** (`components/auth/useAuthForm.ts`): errors appear on blur or submit, then update live; a failed
  submit focuses the first invalid field; server verdicts (duplicate e-mail, bad credentials, lockout) use the
  same UI; a rejected password is cleared and refocused.
- **Stub to replace:** `modules/auth/userRepository.ts` is in-memory (accounts vanish on restart). Implement the
  `UserRepository` interface on the real database (unique index on `email`) and nothing else changes.
- **Next steps:** refresh-token rotation and server-side revocation (needs persistence), e-mail verification,
  password reset, 2FA for withdrawals, audit log of sign-ins.

## Checkout & payments (`/[locale]/checkout`, `/api/checkout`, `/api/payments`)

| Route                      | Who                     | Purpose                                                          |
| -------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `POST /api/checkout`       | merchant (session)      | Turn a cart into a payable session; returns `path` for the buyer |
| `GET /api/checkout/:id`    | public (unguessable id) | Buyer-safe view of the session                                   |
| `POST /api/payments`       | buyer                   | Start a payment → `pending` \| `success` \| `failed`             |
| `GET /api/payments/:id`    | buyer                   | Poll a pending payment                                           |
| `DELETE /api/payments/:id` | buyer                   | Abandon a pending confirmation (choose another method)           |

- **Flow:** merchant creates a session → buyer opens `/checkout?session=chk_…` → pays. Mobile money
  (Multicaixa Express, Unitel Money) returns `pending` (202) and the page polls every 2 s until the payer
  confirms on their phone; cards answer immediately. In sandbox, opening `/checkout?demo` creates a demo
  cart (a bare `/checkout` is the payment gate's page, below).
- **Server is the authority:** totals are computed from the items (a client-sent `total` is ignored); the
  phone (`9` + 8 digits, `+244`/`00244` accepted) and card (Luhn, expiry, CVC) are re-validated with the same
  Zod schemas the form uses (`shared/checkout/schemas.ts`).
- **Idempotent:** a double-click or retry while a payment is pending returns that same payment; a paid session
  refuses further payments (`409 checkout_paid`); sessions expire after 30 min (`410 checkout_expired`).
- **Card data:** validated and dropped — never stored or logged; only brand + last 4 are kept. **Before going
  live, use the provider's hosted fields/tokenisation** so raw card numbers never touch these servers
  (otherwise the platform is in full PCI-DSS scope).
- **Abuse limits:** 8 payment attempts per (IP, session) per 15 min → `429`. `Origin` is checked on mutations.
- **Sandbox simulator** (`payments/simulator.ts`, `PAYMENTS_MODE=sandbox`): deterministic outcomes so every
  state can be tested — phone ending `00` → declined on phone, `01` → insufficient funds, otherwise success
  after 6 s; card `4000 0000 0000 0002` → declined, `…9995` → insufficient funds, otherwise approved.
  `PAYMENTS_MODE=live` is **refused** (`503`) until a real provider is integrated. The page shows a visible
  "test mode" banner whenever the sandbox is on.
- **UI:** mobile-first — 48 px inputs with 16 px text (no iOS zoom), a collapsed order summary that always
  shows the total, and a pay button pinned to the bottom that states the amount. "Encrypted connection" is
  only displayed when the page is actually served over HTTPS. The checkout page is `noindex`.
- **Stubs to replace:** in-memory `checkout/repository.ts` and `payments/repository.ts`; the simulator
  (real provider client + webhooks that publish to the event bus so the merchant dashboard updates live).

## Catalogue (`/[locale]/dashboard/products`, `/api/products`)

| Route                                                        | Purpose                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `GET /api/products?q&category&status&sort&dir&page&pageSize` | Filtered, sorted, paged list + `total` (matches) and `overall` (whole store) |
| `POST /api/products`                                         | Create (201)                                                                 |
| `GET /api/products/:id`                                      | One product                                                                  |
| `PATCH /api/products/:id`                                    | Partial update; only the fields sent change                                  |
| `DELETE /api/products/:id`                                   | Delete (204)                                                                 |
| `GET /api/products/:id/images/:imageId`                      | Image bytes (immutable per id, `nosniff`)                                    |

- **Pages:** the list (`/dashboard/products`), `/new` and `/[id]` (edit; the product is loaded on the server so
  there is no loading flash and a foreign or missing id is a 404). Pages, not a modal: deep-linkable, and the
  form has room for images and the margin panel.
- **Tenant isolation:** every repository call takes the session's `storeId`; another store's product is
  indistinguishable from a missing one (`404`), for reads, writes and images alike.
- **Margin** = (sale − cost) / sale, one function (`computeMargin` in `shared/products/schemas.ts`) used by the
  form's live panel and by the API for the table, so the two can never disagree. Below-cost pricing is allowed
  but shown in the `down` colour with a text warning. Prices are whole Kwanzas in the form, minor units on the wire.
- **Images:** resized in the browser (max 1200 px, JPEG) before upload, so phone photos do not hit slow
  connections or the limits. They travel inline as data URLs in the JSON body (max 5, ~700k chars each, body
  capped at 4 MB → `413 payload_too_large`); the server checks the declared type against the file's magic bytes.
  On update, `images` is the full ordered list: `{ id }` keeps an existing image, `{ dataUrl }` adds one, and the
  first is the cover.
- **Search** ignores case and accents (`cafe` finds `Café`). Filtering, sorting and paging run on the server.
- **Categories and statuses** are fixed codes translated through `Catalog.categories.*` / `Catalog.status.*`.
- **UX:** sortable columns with `aria-sort`; table columns collapse on phones (margin moves under the price);
  delete uses a native `<dialog>` where the safe action is the emphasised one; the Save button is pinned to the
  bottom on phones, like the checkout's Pay button.
- **Stubs to replace:** in-memory `products/repository.ts` (the sandbox store `sto_demo` is seeded with demo
  products) and image storage (use an object store + signed URLs instead of bytes in the process).

## Orders (`/[locale]/dashboard/orders`, `/api/orders`)

| Route                                             | Purpose                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `GET /api/orders?q&status&sort&dir&page&pageSize` | Filtered, sorted, paged list + `total`, `overall` and `counts` per status |
| `GET /api/orders/:id`                             | One order                                                                 |
| `PATCH /api/orders/:id`                           | `{ status, trackingCode? }` — one step along the flow, or a cancellation  |

- **Flow** (`ORDER_TRANSITIONS` in `shared/orders/schemas.ts`): `pending → processing → shipped → delivered`;
  `pending` and `processing` can also be `cancelled`; `delivered` and `cancelled` are final. The same table
  decides what the API accepts (anything else is `409 invalid_transition`) and which buttons the sheet offers.
  Every status an order has been in is kept in `history` (shown as the order's timeline).
- **Read-only list:** orders are _created by the checkout_, not through this API. There is no `POST`. The hookup
  (a successful payment opens an order) is not built yet, so stores get a deterministic demo set
  (`orders/repository.ts`): the sandbox store `sto_demo`, or any store when `KANDROP_DEMO_EVENTS=true`. The demo
  orders reuse the demo catalogue's names and prices, totals always equal items + shipping, and no date is in
  the future.
- **Tenant isolation:** every repository call takes the session's `storeId`; another store's order is a `404`.
- **Tabs:** the status filter is a real `tablist` (arrow keys, Home/End) over one `tabpanel`. Counts honour the
  search but not the status, so they never contradict the rows shown.
- **Detail = side sheet** (native `<dialog>`), not a page: the list keeps its filters, tab and page while the
  merchant fulfils several orders in a row. On phones it is full-screen with the action pinned at the bottom.
  Cancelling asks for confirmation inline; the tracking code is asked for when marking an order as shipped.
- **Cancelling does not refund** the payment (the sheet says so). Refunds belong to the payments module.
- **Personal data** (name, phone, e-mail, address) is only ever returned to the order's own merchant and is never
  logged. Times are shown in `Africa/Luanda`.
- **Shared UI:** `components/data/` (sortable header, pagination, search box, list states, API client) and
  `components/form/` (fields) are used by both the catalogue and the orders.
- **Stub to replace:** in-memory `orders/repository.ts` (`orders`, `order_items` and `order_status_history` tables).

## App shell (`/[locale]/dashboard/layout.tsx`)

One layout wraps every merchant page; pages only render their own `<main>`. In Next.js terms this is the
locale-aware equivalent of `app/dashboard/layout.tsx` (the `[locale]` segment comes first).

- **Server layout** (`layout.tsx`): session gate, loads the signed-in user and the store, reads the sidebar cookie,
  and renders `LiveProvider` › `AppShell`.
- **Navigation** (`shell/nav.ts`, one list drives the sidebar, the drawer and the breadcrumbs): four groups —
  **Principal** (Dashboard, Wallet, Orders), **Dropshipping** (Premium Catalogue, My products, My landing pages,
  Customers), **Accelerators** (WhatsApp automations, Logistics & couriers), **Other** (Academy, Support, Settings).
  Areas that are not built yet (`soon: true`) are dimmed, say "Soon" in the tooltip and to screen readers, and open a
  plain "coming soon" page (`dashboard/[feature]`) — no fake data, no dead link. Real routes (`products`, `orders`,
  `wallet`, `settings`) are static segments and win over that dynamic one. "My products" is the merchant's own catalogue
  (kept in the menu on purpose); "Premium Catalogue" is the future B2B supplier catalogue.
- **Sidebar** (desktop): collapses to an icon rail (cookie `kandrop_sidebar`, read on the server so there is no flash;
  the cookie name lives in `shell/constants.ts` — a constant exported from a `"use client"` file reaches server code as a
  reference, not a value). Below `lg` it is a hamburger drawer (native `<dialog>`).
- **Plan card** (sidebar foot, `shell/PlanCard.tsx` + `PlanProvider`): plan and real usage from `GET /api/plan`,
  fetched once per navigation and shared by the sidebar and the drawer. Products are counted from the catalogue and the
  limit is **enforced** (`403 plan_limit_reached` on the 51st); landing pages are zero because the feature does not exist
  yet. Amber from 80 %, red when full. "Upgrade" leads to the billing page (`/dashboard/billing`).
- **Header:** breadcrumbs derived from the URL, the real-time connection state (Server-Sent Events, not a WebSocket —
  see "Real-time: why SSE first"; one `EventSource` in `LiveProvider` for the whole area), language, account menu.
- **Accessibility:** skip link to `#content`, `aria-current="page"`, the active item is marked by shape (bar + colour).

## Workspace theme (dark only)

Everything inside the shell sits in `.workspace` (`globals.css`): near-black graphite (`ink-900`, `#0a0b0c`) with **one**
accent, a neon green (`#3df58f`) reserved for what is active or actionable (current nav item, primary buttons, focus,
live status). Flat: no gradients, no glow. It is dark whatever the device says (`color-scheme: dark`, and
`html:has(.workspace)` darkens overscroll and scrollbars). It reuses the same token roles, so no component branches on
theme; buyer-facing pages (checkout, receipt) are not inside it and keep the light/dark themes. Contrast is computed, not
eyeballed: ink 17:1, ink-2 10:1, muted 6.3:1, accent on page 13.7:1, button label on accent 13.1:1, field border 4:1; a
browser audit of every visible text node on seven pages plus a dialog found 0 below WCAG AA.

## Route transitions and performance

- **Instant loading state:** `dashboard/loading.tsx` is prefetched with the layout and shown the moment a link is clicked;
  the layout (sidebar, header, live connection) never remounts.
- **Full prefetch on the menu** (`<Link prefetch>`): production only, and required — the dashboard routes are dynamic
  (the layout reads the session), and Next.js by default prefetches a dynamic route only down to its `loading.js`, so a
  click still needed a server round trip and then React's 300 ms Suspense-reveal throttle. Measured in a production build
  (Turbopack): the target page appears in **28–47 ms** instead of 325–355 ms, also with 150 ms latency on a slow link, and
  the prefetch costs about 20 requests / 3 KB on load.
- **Freshness:** a fully prefetched page is cached for 5 minutes. Only Settings has server-side data, so the bank form
  re-checks the account on every mount (`GET /api/settings/bank`); `router.refresh()` was tried first and, combined with
  full prefetch, left the page stuck on its skeleton in Next.js 16.3.6 — do not reintroduce it there.
- **Transitions:** each page wraps its content in `<PageTransition>` (React `<ViewTransition>`, no configuration in the
  App Router): a 160 ms fade with a 6 px rise, only for the page content (the root snapshot is not cross-faded, so the
  shell never flickers), disabled under `prefers-reduced-motion`. It belongs in each `page.tsx`, not the layout.
- **Trade-off:** with `loading.js`, the response is streamed, so an unknown URL inside the dashboard returns HTTP 200 with
  the in-shell not-found page and `noindex` (the area is authenticated, so SEO is irrelevant).
- **Turbopack:** the default bundler for `next dev` and `next build`; its file-system cache is on by default in 16.x, so
  there is nothing to configure. Automatic prefetch does not run in `next dev`, so measure navigation on `next start`.

## Multicaixa Express flow, webhook and receipts

| Route                                     | Who                   | Purpose                                        |
| ----------------------------------------- | --------------------- | ---------------------------------------------- |
| `POST /api/webhooks/multicaixa`           | the provider (server) | Signed callback: the payer approved or refused |
| `GET /[locale]/checkout/success?payment=` | buyer                 | Confirmation page after a paid payment         |
| `GET /[locale]/checkout/receipt?payment=` | buyer                 | The receipt (A4, print / "Save as PDF")        |

- **Flow:** the buyer pays → `createPayment` asks the provider to charge the phone
  (`payments/multicaixa.ts#requestPayment`) and returns `pending` with a provider transaction id (`MCX-…`, kept
  internally as `providerRef`, never sent to the browser). 5–10 s later the simulated provider calls the webhook. The
  checkout polls `GET /api/payments/:id` every 1.5 s (and immediately when the tab becomes visible again, because
  phones freeze timers while the payer is in their bank app) and, on `success`, `router.replace`s to the success page
  so "back" never returns to a payment form for a paid order. Unitel Money still answers by polling (fixed 6 s).
- **The signature is the security of the webhook.** The route is public, so anything unsigned could otherwise mark an
  order as paid. `X-Multicaixa-Signature: t=<unix>,v1=<HMAC-SHA256 of "<t>.<raw body>">`, compared in constant time,
  timestamp within 5 minutes (no replay). Secret: `MULTICAIXA_WEBHOOK_SECRET` (min 32 chars); in sandbox, when unset,
  a random per-process secret is used. Bad or missing signature → `401`; oversized body → `413`.
- **Idempotent and defensive** (`payments/service.ts#applyProviderEvent`): a repeated or late event never changes a
  payment that is no longer pending; an amount that differs from the order is ignored and logged; an approval that
  arrives after the payer cancelled (or after the timeout) is ignored **and logged for reconciliation** — in a real
  integration that is money moved without an order, and needs a refund flow.
- **Timeout:** no callback within 3 minutes → the payment fails with `timeout` instead of hanging.
- **Callback URL** comes from configuration (`APP_URL`, default `http://127.0.0.1:$PORT`), never from the request's
  Host header (that would make the server call an address chosen by the caller). Set `APP_URL` if the app does not
  listen on port 3000.
- **Receipts** (`modules/receipts/`): a receipt is issued automatically inside `markPaid`, the single place every
  success passes through (card, Multicaixa via webhook, Unitel Money). It is an immutable **snapshot** (merchant, items,
  totals, transaction, masked payer) with a sequential number `KD-<year>-<000001>`, one per payment (issuing again
  returns the same document). Declined, cancelled and pending payments get none. The transaction id is the provider's
  (`MCX-…`) when there is one, otherwise our reference; both are shown when they differ. Full card numbers and phone
  numbers never appear (masked only).
- **Document:** server-rendered, designed for A4 (`@media print` in `globals.css`: `@page` margins, white paper and
  dark ink whatever the device theme, toolbar hidden). "Print or save as PDF" opens the browser's print dialog, and the
  page `<title>` becomes the suggested file name (`Recibo de pagamento KD-2026-000001`). There is no server-side PDF
  file: that would need a PDF library or a headless browser on the server.
- **Not a tax invoice.** The receipt says so on its face. An Angolan _fatura_ has legal requirements (certified
  invoicing software, tax number, VAT breakdown) that this platform does not implement; the merchant issues the
  invoice. The merchant block shows the store name and NIF (`null` → "Not provided" until the store settings collect it).
- **Stubs to replace:** in-memory receipts (a table with a unique index on `payment_id` and a real yearly sequence —
  numbers restart with the process here), the provider (real Multicaixa client + its signature scheme: only
  `multicaixa.ts` changes), and the hookup that opens an _order_ for the merchant when a payment succeeds.

## Settings and payouts (`/[locale]/dashboard/settings`, `/[locale]/dashboard/wallet`)

| Route                            | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/settings/bank`         | The payout account, **masked** (`AO06 •••• •••• •••• •••• 1234`) or `null` |
| `PUT /api/settings/bank`         | `{ holderName, iban, password }` — create or replace it                    |
| `GET /api/payouts?page&pageSize` | History (newest first) + `available`, `minAmount`, `hasPending`, `bank`    |
| `POST /api/payouts`              | `{ amount }` in minor units — request a transfer (201, `pending`)          |

- **Settings** are three real tabs (`Profile`, `Store preferences`, `Bank details`) in one page; the tab lives in the URL
  (`?tab=bank`, updated without navigating) and the panels stay mounted, so a half-typed form survives a look at another tab.
  Profile and store preferences are read-only for now.
- **IBAN** (`shared/bank/schemas.ts`): `AO` + 2 check digits + 21 digits = 25 characters, **and** the ISO 7064 mod 97-10
  checksum. The two digits after `AO` are _derived from the account_, so they are not always `06`; hard-coding `AO06` would
  reject real accounts. The input keeps the `AO` fixed, accepts only digits after it, caps at 25, groups in fours and
  strips spaces/lower case on paste. The same schema runs in the browser and on the server.
- **Bank details are sensitive.** The full IBAN is never returned once saved (masked only). Changing them requires the
  **current password** (the classic account-takeover move is to redirect payouts) — 5 wrong tries per user per 15 min →
  `429`, even if the next one is right. Only the store **owner** can change them or request a payout (`403` otherwise).
  Stub to replace: the in-memory repository must **encrypt the IBAN at rest**.
- **Balance ledger.** The dashboard simulator keeps _one_ balance shared by every demo store, so each store's own withdrawals
  are subtracted in `dashboard/service.ts#withPayouts` (`payouts/ledger.ts#reservedAmount`), used by the snapshot and by the
  live feed, so the dashboard KPI and the payouts page always agree. A payout publishes the new summary at once, so open
  dashboards update instantly. Seeded past payouts are flagged `historical` and are not subtracted again.
- **Payout rules** (`payouts/service.ts`): a bank account must exist (`409 no_bank_account`); amount between 5 000 Kz and
  the balance (`422 amount_too_low` / `amount_too_high`, `409 insufficient_balance`); **one pending payout at a time**
  (`409 payout_pending`), which also makes a double click harmless. The amount leaves the balance on request; the bank
  details are **snapshotted** on the payout, so changing the account later never rewrites history.
- **Simulation:** a payout is `pending` for 15–25 s and then `completed` (applied lazily on read; the page re-checks every
  4 s while one is pending, so the badge turns by itself). A real transfer takes days; the dialog says the transfer is simulated.
- **UI:** the balance is the largest thing on the page (live, from the same feed as the dashboard). The request button says
  _why_ it is unavailable (no bank account / one already pending / balance below the minimum) instead of just greying out.
  "Withdraw all" fills whole Kwanzas, so a remainder under 1 Kz stays in the balance.
- **Client/server boundary:** anything the server page calls (e.g. `isSettingsTab`) lives in a plain module, not in a
  `"use client"` file — a value exported from a client module is a reference on the server and throws when called.
- **Stubs to replace:** in-memory bank/payout repositories (a real yearly sequence for `LV-<year>-<000001>`, unique per
  store), the simulated bank, and the fees / cooling-off period a real payout would have.

## Public site (`/[locale]`, route group `(marketing)`)

The landing page that sells Kandrop to merchants. It replaces the old placeholder home; `/` redirects to `/pt` (the
default locale). Files: `app/[locale]/(marketing)/{layout,page}.tsx`, `[page]/page.tsx` and `components/marketing/`.

- **Sections:** sticky navbar (wordmark, Home / Pricing / Affiliates / About, language, "Sign in", highlighted "Get started"; a
  sheet on phones), hero, "Why Kandrop?" (three pillars), pricing (three tiers, prices formatted with `Intl`), final call to
  action, footer. `/afiliados` and `/sobre` are honest "coming soon" pages, so the navigation has no dead link.
- **Static:** the layout reads no session, so the page is prerendered for `pt`, `en` and `fr` (SSG) and served from cache.
  Measured on a production build: LCP 100 ms desktop, 1.16 s on a phone with 4× CPU slowdown and slow 4G, CLS ≈ 0. The hero
  picture is HTML/SVG, not an image, so there is nothing to download.
- **Theme:** `.marketing` shares the dark tokens with `.workspace` (near-black `ink-900`, one neon-green accent), dark whatever
  the device says. Unlike the app, it may use **one soft glow** of the accent (behind the hero and behind the recommended
  plan) — a sales page has to draw the eye. No other gradients, no second accent.
- **Motion:** the hero enters on load (CSS, staggered); blocks below the fold play their entrance when they first reach the
  screen (`RevealController`, `IntersectionObserver`); the cards float. All of it is off for `prefers-reduced-motion`.
  **Nothing is ever hidden beforehand:** a first version hid below-the-fold blocks until scrolled to (scroll-driven CSS, then an
  observer that added a hidden class) and full-page screenshots, crawlers and no-JS visitors saw blank sections. Content must
  be complete without scrolling or scripts.
- **Honesty rules** (the page is a promise to strangers): the floating "sales" cards and the dashboard picture are
  **illustrative** and say so in visible text beside them; features that are not built (B2B catalogue, WhatsApp automations,
  logistics) carry a "Soon" tag, as in the app's menu.
- **Copy to verify before publishing.** Prices in `components/marketing/tiers.ts` are placeholders (only Starter's limits are the
  real, enforced ones); "payouts in 24 h", "own logistics" and "integrated Multicaixa Express" are claims the platform cannot
  yet fully back (payouts and payments are simulated, logistics is not built). They are the owner's words, kept as asked.
- **SEO:** localized `<title>`/description (`Metadata`), canonical and `hreflang` alternates. No Open Graph image yet.

## WhatsApp automations (`/[locale]/dashboard/automations`, `/api/automations`)

| Route                                | Purpose                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| `GET /api/automations`               | `{ connection, flows[] }` for the store                     |
| `POST /api/automations/connection`   | `{ phone }` (9 national digits) — start pairing; owner only |
| `DELETE /api/automations/connection` | Cancel pairing or disconnect; also switches every flow off  |
| `PATCH /api/automations/flows/:key`  | `{ enabled?, template?, reset? }`                           |

- **Everything here is simulated, and the page says so.** No message is sent: the module stores the connection state, which
  flows are on and what each one says. There are no cart-abandonment or courier events to trigger a flow yet, so hooking a
  flow to its event (a failed payment → +1 h, `issueReceipt`, a courier leaving) is the next step, not something already wired.
- **Connection** (`disconnected → pending → connected`): `POST` returns a pairing code and, 7–12 s later, the simulated phone
  "scans" it (applied lazily on read; the page polls every 2 s while pending). The QR picture is drawn from the code and
  **encodes nothing**; it is labelled "simulated". The pairing code is never returned once connected.
- **Rules:** a flow can only be switched **on** while connected (`409 whatsapp_not_connected`; the switches are disabled and
  say why); reconnecting while connected is refused (`409 whatsapp_already_connected`); disconnecting turns every flow off.
  Owner only for every write. State is per store (tenant-scoped), in memory (stub: needs tables, and the WhatsApp access token
  must be **encrypted at rest**).
- **Templates** (`shared/automations/schemas.ts`, one rule set for the browser and the API): 1–1000 characters, and only the
  variables the flow offers (`{nome_cliente}`, `{nome_produto}`, `{link_pagamento}`, `{nome_loja}`, `{valor_total}`,
  `{referencia}`, `{link_recibo}`, `{codigo_seguimento}`, `{nome_estafeta}`). An unknown variable or a stray brace is a
  `422` with a code, and the same check drives the editor's live message. Saving the default text stores no override.
  Templates are addressed to the merchant's _customers_ (Angolan Portuguese), so they are content: they do not change with the
  dashboard's language.
- **Editor:** a side sheet (native `<dialog>`) with the template, variable buttons that insert at the cursor (the caret is
  restored in a layout effect, because a controlled textarea resets it to the end), and a WhatsApp-style preview filled with
  example data. Filled variables are picked out by colour and weight; an unknown one is underlined with a wavy line, so it is
  not colour alone.
- **Switches** (`components/form/Switch.tsx`): `role="switch"`, Space/Enter, 44 px hit area, optimistic with rollback on error.

**Before this becomes real**

- The official route is the **WhatsApp Business Platform** (Meta Cloud API): the number is registered through Meta, not paired
  with a QR code. QR pairing is the unofficial WhatsApp Web protocol: it breaks the terms of service and gets numbers banned.
- Messages the business starts outside the 24-hour customer window must use **templates approved by Meta**. The editor is the
  right UI, but saving would submit a template for approval and wait for the verdict; the editor already tells the merchant so.
- The header's "+30% sales" is a claim with no data behind it (`Automations.title`); remove or source it before production.

## Logistics (`/[locale]/dashboard/logistics`, `/api/deliveries`)

Quick dispatch of packed orders to the Kandrop courier network, a live deliveries table and proof of delivery.
**Everything about the network is simulated**: couriers (`modules/logistics/couriers.ts`, 9 fictional people, phones
`900000101…109`), trips, photos and signatures (seeded SVGs, labelled "test image").

- `GET /api/deliveries?status=&page=&pageSize=` (counts per status, server `now` for clock alignment), `GET /api/deliveries/[id]`,
  `POST /api/deliveries {orderId}` (owner only): the order must be `processing`; picks the least-loaded courier covering the
  order's zone (max `COURIER_CAPACITY` = 3, else `no_courier_available`; Lubango is deliberately uncovered), ships the order
  with a `KD…AO` tracking code. Errors: `order_not_dispatchable`, `delivery_exists`, `no_courier_available` (all 409).
- **State is never stored.** Stage/progress/status derive from `createdAt + durationMs` and the clock (`shared/logistics`), so
  server and browser agree; the browser recomputes every second (no polling). When a trip ends the server moves the order
  (`delivered`, or force-`cancelled` for a return) the next time anyone lists deliveries (`syncOrders`).
- Sandbox rules: a dispatched trip lasts 45–75 s; an order whose number is a multiple of 7 is returned (`customer_absent`).
  Seeded deliveries agree with the seeded orders (in transit / delivered / one returned).
- UI detail: the open sheet is fetched on its own (`GET /api/deliveries/[id]`), because when its trip ends it leaves the
  "In transit" list and must not vanish under the user.

**Before this becomes real**

- A courier network integration (assignment, live position, real ETAs), proof capture in the courier app, and a retention and
  consent policy for photos and signatures (personal data). The landing page's "own logistics" claim is not true yet.
- Orders can also be advanced by hand in Orders; decide how that interacts with a Kandrop delivery in progress.

## Affiliates (`/[locale]/dashboard/affiliates`, `/api/affiliates`, `/[locale]/join`)

Hero, the store's exclusive link (copy / share on WhatsApp), four KPIs and a referrals table. Owner only (it is about money).

- `GET /api/affiliates?page=&pageSize=`: link (`APP_URL`, else request origin, `/join?ref=<code>`), KPIs, one page of referrals.
  The code is the owner's first name (`filipe`, `filipe2`… if taken). **E-mails are masked on the server** (`maskEmail`), the
  browser never receives the full address. Money is integer minor units; commission = `COMMISSION_BPS` (2000 = 20%) of the
  plan price, per paid month. "Available" = every paid month's commission (nothing is paid out yet).
- `GET /[locale]/join?ref=code` counts a click for that affiliate and redirects to sign-up; an unknown or malformed code is
  ignored (no error, so codes cannot be probed). **Sign-ups are not attributed yet** (no cookie, no link to the new store).
- Demo stores (`sto_demo` / `KANDROP_DEMO_EVENTS`) get 14 made-up referrals, labelled as examples on the page; other stores
  start empty.

**Before this becomes real**

- The 20% rate, its "recurring" duration and the payout rules are a commercial decision; plan prices are the marketing
  page's placeholders (`components/marketing/tiers.ts`). Confirm them before the page is public.
- Attribution (cookie on `/join`, stored on registration), fraud controls (self-referral, bot clicks, de-duplicated clicks),
  real billing states, a `referrals`/`affiliate_clicks` schema, and paying commissions out through the wallet.

## Public product page (`/[locale]/loja/[slug]`, `/api/store/[slug]/*`)

The page a shopper lands on from an ad or a shared link: gallery, price, offer countdown, payment methods, description and a
pinned "Buy now" button that goes straight to the existing checkout. Mobile-first (one column, sticky button), two columns from `lg`.

- **Data** (`modules/storefront`): only `active` products are public (draft/archived/unknown → 404). Products gained `slug`
  (`title-xxxxxx`, unique across stores, never changes; the demo catalogue uses plain slugs), `stock`, `compareAtPrice`,
  `offerEndsAt` and `views`. The shopper's browser never receives cost, margin or the store id, nor the exact stock of a
  well-stocked product (only `remaining` when 5 or fewer are left).
- **Conversion triggers are true by construction.** The low-stock banner needs real `stock`; the struck price needs a real
  `compareAtPrice`; the countdown needs a real `offerEndsAt`, and when it passes `offerOf()` (shared by page, API and checkout)
  charges the regular price and removes the strike-through, so the deadline is a promise the shop keeps. The countdown counts
  from the server clock plus a monotonic timer (a wrong phone clock cannot change it) and refreshes the page at zero.
- **Reviews** are shown **only in sandbox mode and labelled "Test examples"**; there is no reviews system, and a live shop
  must never show invented customers.
- **Buy now** is a plain HTML form → `POST /api/store/[slug]/checkout` (works before JavaScript loads): it creates the checkout
  session at the price of that second (server-side), or sends the shopper back to the page when the product just sold out
  (`out_of_stock`). Rate limited per IP. Quantity is fixed at 1; stock is checked, not reserved, and not decremented by sales.
- **Views** (simulated analytics): `ViewBeacon` posts `/api/store/[slug]/view` once per browser session per product; the
  server ignores obvious bots and cross-origin posts. Shown as a column in the merchant's products table.
- Merchant side: the product form has a "Stock and offer" section (validated by `offerProblem`, shared with the API) and a
  "View public page" link.

**Before this becomes real**

- **Cash on delivery does not exist**: the checkout offers Multicaixa Express, Unitel Money and card only, so the button lists
  those. Adding COD is a payments and fulfilment decision, not a label.
- Shipping: the store has no rates, so the session carries `0` and the checkout shows it as "Free". Add shipping rates (or hide
  the line) before selling for real.
- Real inventory (reserve on checkout, decrement on payment), a real reviews system (verified purchases only), bot filtering
  and de-duplication for views in a store, image CDN and Open Graph images, the Landing Pages manager (still "Soon") that will
  own layout and copy, and a legal check of price-reduction claims ("original price") under Angolan consumer rules.

## Billing and plans (`/[locale]/dashboard/billing`, `/api/billing`)

The merchant's own subscription to Kandrop (SaaS billing): current plan and usage, the plan cards, a payment dialog and the invoice
history. Owner only (it is the account's money). The plan card in the sidebar links here.

- **One source for plans**: `modules/plan/limits.ts` holds keys, limits (`null` = unlimited) and prices: **Starter 14.999 Kz**
  (50 products, 5 landing pages) and **Pro 34.999 Kz** (unlimited). There is **no free plan**. The landing page's tiers, the
  affiliates' commissions, the payment-gate page and this page all read it. The tax treatment (IVA) is still undecided.
- **Which plan a store is on** is never stored as a flag: `billing/plan.ts#planOf` reads the paid period (`periodEnd`) against
  the clock and returns `null` when there is none: that `null` is what the **payment gate** keys on (next section). Only the
  product limit is enforced (`products/service.ts`); landing pages are not built (usage 0). Other advantages are **not gated**.
- **Paying**: `POST /api/billing/checkout {plan}` creates an ordinary checkout session owned by the platform
  (`sto_kandrop`, so the money never lands in the merchant's own wallet) tagged with `subscription`. The dialog then reuses the
  buyer's `PaymentForm` (`inline`) and `usePaymentPolling` (Multicaixa Express first, Unitel Money, card). When a payment is
  confirmed, `markPaid` (the one place every success passes, including the signed webhook) issues the receipt and calls
  `billing/activation` which switches the plan on: 30 days (`PERIOD_DAYS`). Renewing adds days after the current end; moving up
  starts a fresh period now (**no pro-rata credit**); a smaller plan than the active one is refused (`plan_not_upgradable`).
  Idempotent per charge.
- **Invoices** are the store's payment attempts that reached a payment (paid / pending / failed); a paid one links to the
  print-ready receipt (`/checkout/receipt?payment=…`, "Save as PDF"). It is a payment receipt, **not a fiscal invoice**, and says so.

**Before this becomes real**

- Fiscal invoicing: Angolan rules (certified invoicing software, IVA, NIF of both parties) are not met by the receipt.
- A real payment provider, recurring billing (renewal reminders, retries, cancellation), pro-rata on upgrades, refunds, and
  gating the advantages each plan promises (today only the product limit). Confirm the prices and limits.
- A `subscriptions` / `charges` schema, and letting staff (not only the owner) see invoices if that is wanted.

## Academy (`/[locale]/dashboard/academy`, `/api/academy`)

A course-platform layout: "Your progress" (percentage, neon bar, a Continue button), a video-player frame that can be expanded
to page width or taken to full screen, and a module/lesson accordion whose lessons are visibly completed (check), next (play)
or locked (lock). Any signed-in person can use it; progress belongs to the person, not the store.

- **The course is data** (`shared/academy/course.ts`: 4 modules, 11 lessons, planned minutes); titles and descriptions are
  translated (`Academy.modules.*`, `Academy.lessons.*`) and lesson ids are literal types, so a missing translation fails the build.
- **Progress is computed, never typed in**: `lessonStates()` derives completed / available / locked from the set of completed
  lessons (strictly in order: only the first uncompleted lesson is available). The percentage, minutes left and "continue" target
  come from it. `POST /api/academy/lessons/[id]/complete` is idempotent and answers `lesson_locked` (409) for a lesson that is
  still locked, so the order is enforced by the server, not just drawn by the page.
- Demo stores start with the first five lessons done (45%) and the page says the starting progress is an example.
- **The video is a labelled placeholder** ("Video coming soon"): there are no recordings, the play button says so, and lessons
  are marked done by hand. When videos exist, a `<video>` goes inside the same frame (`VideoPlayer`).

**Before this becomes real**

- The lessons: the outline (titles, descriptions, lengths) is a draft; recording, hosting and streaming (adaptive bitrate,
  captions, low-bandwidth mode for mid-range phones) are all still to do. Mark a lesson done from real playback (watched to the
  end), not by a button.
- A `lesson_progress` table, certificates or badges if wanted, and analytics on drop-off per lesson. Nothing gates the course by
  plan today.

## Payment gate (`/[locale]/checkout` without parameters, `server/auth/access.ts`)

A strict SaaS paywall: **no paid period, no dashboard.** Sign-up always ends at `/checkout`, never at `/dashboard`.

- **The rule** (`hasAccess`): a session may use the merchant area only while its store has an active paid period
  (`planOf(storeId) !== null`). A new account has none; an account whose 30 days ran out has none again. Computed from the
  clock on every request, never from a stored flag. The only exception is the `AUTH_DEV_BYPASS` demo user (refused in production).
- **Enforced three times, all server side.** _The proxy_ (`src/proxy.ts`, the Next 16 `middleware.ts`) is the first door: for every
  `/<locale>/dashboard/**` request (page loads and the background fetches of client-side navigation alike) it redirects a request
  with no session to `/login` and one with no active subscription to `/checkout` **before anything is rendered** (it marks
  the redirect with `X-Kandrop-Gate`), so a dashboard page added later cannot forget the rule. _The pages_: the dashboard layout and
  every dashboard page call `requirePaidSession(locale)`. _The APIs_: `requireSession(req)` answers **402 `payment_required`**
  for a valid session without access; the only routes that opt out (`{ allowUnpaid: true }`) are `GET /api/me` and
  `POST /api/billing/checkout` (start paying); auth routes and public pages (storefront, buyer checkout, webhooks) are outside
  it. The browser's API client sends a 402 to `/checkout` too. The proxy reads the subscription from the same in-memory
  store as everything else (`hasAccess`); when subscriptions move to a database this check becomes a database read on every
  dashboard request, so cache it briefly or carry the state in a short-lived signed claim.
- **Where people land.** `POST /api/auth/register` and `/login` return `subscription: "active" | "pending"`: the register form
  goes to `/checkout`, the login form to `/dashboard` only when active, else `/checkout`.
- **`/checkout` (no parameters)** is the gate's door: signed out → `/register`; already paid → `/dashboard`; otherwise two steps
  in client state (**Plan**, then **Payment**). The payment is the _real_ sandbox one, shared with the billing dialog
  (`billing/PlanPayment.tsx`: Multicaixa Express, Unitel Money, card): confirming it activates the plan in `markPaid`, and
  the page then opens the dashboard by itself. `/checkout?session=…` (buyer checkout) and `/checkout?demo` are unchanged.
- The earlier three-step prototype (details form, EUR/USD card, bank transfer with receipt upload) was removed: nothing
  could process those payments and the account now exists before this page. It is in git history (`020c9f9`).

**Before this becomes real**

- **Nothing is charged for real**: payments are the sandbox simulator (see `DEPLOY.md`), and accounts live in memory.
- No renewal reminders or grace period: when the 30 days end the next request is a 402 and the next page a redirect to `/checkout`.
  A public store of a lapsed merchant still sells (the storefront does not check the subscription).
- Bank transfer and EUR/USD are not offered: they need manual verification / a real processor.
- If sign-up moves to Supabase Auth, keep `hasAccess` as the single rule and read the subscription from the database.

## Status

Stubbed and to be implemented: persistence (users are in-memory),
real aggregations in `dashboard/service.ts`, real event producers (payment webhooks).
