/**
 * The delivery day the shopper asks for. Rules (one place, shared by the checkout and the server):
 * a calendar day `YYYY-MM-DD` in Luanda time, never a Sunday. The checkout offers the next 4 such days starting TODAY
 * (a Sunday is skipped, so there are always 4 real options); the server accepts any non-Sunday day from today up to
 * `DELIVERY_WINDOW_DAYS` ahead, so a page left open overnight does not fail.
 */
export const DELIVERY_WINDOW_DAYS = 10;
export const DELIVERY_OPTIONS = 4;
const DAY = 86_400_000;
const LUANDA_OFFSET = 3_600_000; // UTC+1, no daylight saving

/** Today's calendar day in Luanda, as a UTC midnight timestamp. */
export const luandaToday = (now = Date.now()) => {
  const d = new Date(now + LUANDA_OFFSET);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

export const toIsoDay = (utcMidnight: number) => new Date(utcMidnight).toISOString().slice(0, 10);

/** Sunday is the one day nothing is delivered. */
export const isSunday = (utcMidnight: number) => new Date(utcMidnight).getUTCDay() === 0;

export function isDeliverableDay(utcMidnight: number, now = Date.now()) {
  const today = luandaToday(now);
  return utcMidnight >= today && utcMidnight <= today + DELIVERY_WINDOW_DAYS * DAY && !isSunday(utcMidnight);
}

/** `YYYY-MM-DD` → UTC midnight, or `null` when it is not a real calendar day. */
export function parseIsoDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(t) || toIsoDay(t) !== value ? null : t;
}

/** The days offered at checkout: `count` calendar days from today on, skipping every Sunday (`YYYY-MM-DD`). */
export function deliveryOptions(now = Date.now(), count = DELIVERY_OPTIONS): string[] {
  const out: string[] = [];
  for (let day = luandaToday(now); out.length < count; day += DAY) if (!isSunday(day)) out.push(toIsoDay(day));
  return out;
}

/** What the checkout page needs, from ONE reading of the clock: today and the offered days. */
export function checkoutDays(now = Date.now()) {
  return { today: toIsoDay(luandaToday(now)), days: deliveryOptions(now) };
}
