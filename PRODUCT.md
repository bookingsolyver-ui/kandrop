# Kandrop — Product & Design Context

Input for `/impeccable init`. Edit freely; this is the brief the design pass should follow.

## What it is

Kandrop is a high-performance payments platform for Angola. Merchants accept payments in
Kwanza (AOA), monitor activity in real time and reconcile settlements.

## Users

- **Merchants / store owners** — need clarity and trust at a glance; often on mid-range mobile
  devices and variable connections.
- **Finance / operations staff** — dense, scannable data; audit trails.

## Brand personality

Premium, institutional, calm, precise. Closer to a private bank than to a fintech startup.
Confident restraint over decoration. Trust is the product.

## Design direction

- Premium and institutional: generous whitespace, strict grid, muted palette with one disciplined accent.
- Typography carries the brand: refined serif or high-quality grotesque for headings, tabular
  numerals for every monetary value.
- Motion is functional (live data updates, state changes), never decorative.
- Accessible by default (WCAG AA), works on low-end Android, resilient to slow networks.

## Constraints

- Languages: **PT (default, pt-AO)**, **EN**, **FR**. Every visible string comes from `messages/*.json`.
  Layout must tolerate ~30% longer text (FR/PT) without breaking.
- Currency: AOA, formatted per locale via `Intl` (never hand-built strings).
- Tokens live in `src/app/globals.css` (roles: page, surface, ink, line, brand, series, up/down). Light and dark are defined; chart series colours are validated.
- Stack: Next.js App Router, Tailwind CSS v4, React 19.

## Anti-goals

Generic SaaS gradients, stock illustrations, crypto aesthetics, playful/gamified tone.

## Update — merchant workspace (2026-09-24)

Direction chosen for the merchant area only (everything behind the login, inside the app shell):

- **Dark only**, on a near-black graphite (`ink-900`), regardless of the device theme.
- **One accent, neon green**, used only for what is active or actionable. It stays _institutional_: flat, no gradients, no
  glow, no decoration, and every text/control pair meets WCAG AA (verified by computation).
- Ambition: speed and conversion. Navigation must feel instant (prefetched, transitions under 200 ms, none when the user
  asks for reduced motion).

Unchanged: the buyer-facing pages (checkout, receipt) keep the light/dark themes and the calm, bank-like tone above, and the
anti-goals still apply — in particular the neon accent must not drift into "crypto aesthetics" (no glows, no gradients, no
second accent, no playful copy).

### Addendum — public marketing site (2026-09-24)

- Same dark theme and single neon-green accent as the workspace. The **only** allowed exception to "no gradients": one soft
  glow of the accent behind the hero and behind the recommended plan.
- Anything that looks like real activity (sales notifications, dashboard pictures, testimonials) must be **labelled as an
  example** in visible text. No invented numbers, customers or reviews presented as real.
- Features that are not built are tagged "Soon", never promised as live. Prices and commercial claims on the page need an
  owner's confirmation before it is published.

### Addendum — public product page (2026-09-24)

- The buyer-facing product page keeps the calm, bank-like tone and the device's light/dark theme (not the workspace's dark-only).
- **Urgency and social proof must be true.** "Only N left" comes from real stock, a countdown from a real deadline after which
  the price really changes, a struck-through price from a real regular price. Invented reviews, customers or scarcity are never
  shown as real; example content exists only in the test environment and is labelled as such.
- Copy only promises what the product does: payment methods are the ones the checkout supports.
