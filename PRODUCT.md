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
- Tokens live in `src/app/globals.css` (`@theme`); the current values are placeholders.
- Stack: Next.js App Router, Tailwind CSS v4, React 19.

## Anti-goals

Generic SaaS gradients, stock illustrations, crypto aesthetics, playful/gamified tone.
