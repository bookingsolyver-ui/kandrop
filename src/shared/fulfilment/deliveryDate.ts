/**
 * The delivery day the shopper asks for. Rules (one place, shared by the picker and the server):
 * a calendar day `YYYY-MM-DD` in Luanda time, from tomorrow up to 30 days ahead, never a Sunday.
 */
export const DELIVERY_WINDOW_DAYS = 30;
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
  return utcMidnight >= today + DAY && utcMidnight <= today + DELIVERY_WINDOW_DAYS * DAY && !isSunday(utcMidnight);
}

/** `YYYY-MM-DD` → UTC midnight, or `null` when it is not a real calendar day. */
export function parseIsoDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(t) || toIsoDay(t) !== value ? null : t;
}
