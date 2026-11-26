// Fields a client may set on a trade. Everything else in a request body (_id,
// createdAt, unknown keys, operators) is dropped before it reaches MongoDB.
const TRADE_FIELDS = [
  "date", "time", "pair", "type", "lot", "entry", "sl", "target", "exit",
  "pnl", "pips", "rr", "strategy", "session", "mistakes", "noMistakesFlag",
  "emotion", "reasoning", "lesson", "rulesFollowed", "tags", "screenshot", "propFirm",
] as const;

export function pickTradeFields(body: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== "object") return out;
  const src = body as Record<string, unknown>;
  for (const k of TRADE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
  }
  return out;
}

// Trade dates are stored and compared as "YYYY-MM-DD" strings; anything else breaks sorting.
export function isDateKey(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
