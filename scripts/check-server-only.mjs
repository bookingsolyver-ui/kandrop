// Fails if a module of the server side lacks `import "server-only";`. That import turns "a client component
// imported this" into a BUILD error, so a key, a database client or a decryption helper can never end up in
// the browser bundle by accident. A file may opt out only by being listed here WITH the reason.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/server"];
const EXTRA = ["src/lib/supabase/server.ts"];
/** Files that are deliberately shared with the browser. Keep this list tiny. */
const EXEMPT = new Map([["src/server/modules/plan/limits.ts", "plain public constants (plan names, limits, prices) read by the subscribe screens"]]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const missing = [...ROOTS.flatMap(walk), ...EXTRA].filter((file) => {
  if (EXEMPT.has(file)) return false;
  return !/^import\s+["']server-only["'];?/m.test(readFileSync(file, "utf8").slice(0, 400));
});

if (missing.length) {
  console.error(`[server-only] missing "import 'server-only';" in:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log("[server-only] OK — every server module is fenced off from the browser.");
