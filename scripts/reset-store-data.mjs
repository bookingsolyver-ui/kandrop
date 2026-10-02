#!/usr/bin/env node
/**
 * Wipes the SALES history of one store (or of every store) so real testing can start from absolute zero.
 *
 *   node scripts/reset-store-data.mjs --store sto_xxxx            # dry run: only COUNTS, deletes nothing
 *   node scripts/reset-store-data.mjs --store sto_xxxx --apply    # deletes
 *   node scripts/reset-store-data.mjs --all-stores --apply --confirm RESET   # every store
 *
 * Add  --catalog  to ALSO wipe the catalogue side: every store's products (+ images), the Vitrine imports, and the suppliers'
 * products (the Vitrine items and their inventory). Suppliers' ACCOUNTS stay, so a test supplier can add a product from zero.
 *   node scripts/reset-store-data.mjs --all-stores --apply --confirm RESET --catalog
 *
 * Deleted (per store): orders, supplier lines (supplier_orders), their invoices, deliveries, payouts (merchant
 * withdrawals), checkout sessions that were product purchases, and the product view counters.
 * Supplier stock that those orders had reserved is GIVEN BACK first, so suppliers' inventory stays right.
 * KEPT: accounts, stores and their settings, products and imports, coupons, bank details, subscriptions and the plan
 * charges, suppliers and their catalogue, push subscriptions.
 * Reads SUPABASE_URL and the service key from .env.local; nothing is printed except counts.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const db = createClient(env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const apply = flag("--apply");
const catalog = flag("--catalog");
const all = flag("--all-stores");
const store = value("--store");
if (!all && !store) { console.error("Say which store: --store <id> or --all-stores (add --apply to really delete)."); process.exit(1); }

let stores;
if (all) stores = (await db.from("stores").select("id,name")).data ?? [];
else {
  const s = (await db.from("stores").select("id,name").eq("id", store).maybeSingle()).data;
  if (!s) { console.error(`No store with id ${store}.`); process.exit(1); }
  stores = [s];
}

const count = async (table, id) => (await db.from(table).select("*", { count: "exact", head: true }).eq("store_id", id)).count ?? 0;
const TABLES = ["order_invoices", "supplier_orders", "deliveries", "orders", "payouts"];
const CATALOG_TABLES = ["product_images", "supplier_imports", "products"]; // children first
const total = async (table) => (await db.from(table).select("*", { count: "exact", head: true })).count ?? 0;

for (const s of stores) {
  const counts = Object.fromEntries(await Promise.all(TABLES.map(async (t) => [t, await count(t, s.id)])));
  const { data: lines } = await db.from("supplier_orders").select("supplier_product_id,stock_reserved,stock_restored_at,logistics_status").eq("store_id", s.id);
  const toGiveBack = (lines ?? []).filter((l) => l.supplier_product_id && !l.stock_restored_at && l.logistics_status !== "cancelled" && l.stock_reserved > 0);
  if (catalog) for (const t of CATALOG_TABLES) counts[t] = await count(t, s.id);
  console.log(`${apply ? "TO DELETE" : "DRY RUN"}  ${s.id}  "${s.name}"  ${JSON.stringify(counts)}  stock units to give back: ${toGiveBack.reduce((n, l) => n + l.stock_reserved, 0)}`);
}
if (catalog) console.log(`${apply ? "TO DELETE" : "DRY RUN"}  (all suppliers)  supplier_products: ${await total("supplier_products")}  (suppliers kept: ${await total("suppliers")})`);
if (!apply) { console.log("\nNothing was deleted (dry run). Add --apply to delete."); process.exit(0); }

// Wiping EVERY store needs an explicit confirmation: `--confirm RESET` (works from `!` / CI, where nothing can be typed),
// or, in a real terminal, typing RESET at the prompt.
if (all && value("--confirm") !== "RESET") {
  if (!process.stdin.isTTY) {
    console.error('\nNot confirmed. Add  --confirm RESET  to wipe every store (this shell cannot ask you to type it).');
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nThis wipes the sales history of ${stores.length} store(s). Type RESET to continue: `);
  rl.close();
  if (answer !== "RESET") { console.log("Cancelled."); process.exit(0); }
}

for (const s of stores) {
  // 1. give the reserved supplier stock back (only lines that still hold it)
  const { data: lines } = await db.from("supplier_orders").select("id,supplier_product_id,stock_reserved,stock_restored_at,logistics_status").eq("store_id", s.id);
  for (const l of lines ?? []) {
    if (!l.supplier_product_id || l.stock_restored_at || l.logistics_status === "cancelled" || !(l.stock_reserved > 0)) continue;
    const { data: p } = await db.from("supplier_products").select("stock").eq("id", l.supplier_product_id).maybeSingle();
    if (p) await db.from("supplier_products").update({ stock: p.stock + l.stock_reserved, updated_at: Date.now() }).eq("id", l.supplier_product_id);
  }
  // 2. delete, children first
  for (const t of TABLES) {
    const { error } = await db.from(t).delete().eq("store_id", s.id);
    if (error) console.error(`  ${t}: ${error.message}`);
  }
  await db.from("checkout_sessions").delete().eq("store_id", s.id).not("product_id", "is", null);
  if (catalog) {
    for (const t of CATALOG_TABLES) {
      const { error } = await db.from(t).delete().eq("store_id", s.id);
      if (error) console.error(`  ${t}: ${error.message}`);
    }
  } else await db.from("products").update({ views: 0 }).eq("store_id", s.id);
  console.log(`  done: ${s.id}`);
}
if (catalog) {
  // The suppliers' products (Vitrine items and their stock). Lines pointing at them were already deleted above.
  const { error } = await db.from("supplier_products").delete().not("id", "is", null);
  if (error) console.error(`  supplier_products: ${error.message}`);
  else console.log("  done: supplier_products (all)");
}
console.log("\nFinished. Dashboard totals, the sales chart and the order list are now empty for the cleaned store(s).");
