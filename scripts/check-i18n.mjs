// Fails if any locale catalogue is missing (or has extra) keys compared to pt.json.
import { readFileSync } from "node:fs";

const locales = ["pt", "en", "fr"];
const source = "pt";

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

const load = (locale) =>
  new Set(
    flatten(
      JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))
    )
  );

const reference = load(source);
let failed = false;

for (const locale of locales.filter((l) => l !== source)) {
  const keys = load(locale);
  const missing = [...reference].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !reference.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(
      `[i18n] ${locale}: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
    );
  }
}

if (failed) process.exit(1);
console.log(`[i18n] OK — ${locales.length} locales, ${reference.size} keys each.`);
