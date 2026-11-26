// Fields a client may set on a trade. Everything else in a request body (_id,
// createdAt, unknown keys, operators) is dropped before it reaches MongoDB.
const TRADE_FIELDS = [
  "date", "time", "exitTime", "pair", "type", "lot", "entry", "sl", "target", "exit",
  "pnl", "grossPnl", "fees", "riskAmount", "pips", "rr", "strategy", "session", "mistakes", "noMistakesFlag",
  "emotion", "reasoning", "lesson", "rulesFollowed", "tags", "screenshot", "propFirm", "accounts", "setupChecks",
] as const;

export function pickTradeFields(body: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== "object") return out;
  const src = body as Record<string, unknown>;
  for (const k of TRADE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
  }
  // exitTime: "HH:MM" or empty
  if ("exitTime" in out) {
    const v = typeof out.exitTime === "string" ? out.exitTime.trim() : "";
    out.exitTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : "";
  }
  // Fees: a trade sent with grossPnl gets pnl = grossPnl − fees here, so the stored net
  // P&L can never disagree with its parts.
  if ("fees" in out) {
    const f = Number(out.fees);
    out.fees = Number.isFinite(f) && f > 0 ? Math.round(f * 100) / 100 : 0;
  }
  if ("grossPnl" in out) {
    const g = out.grossPnl === null || out.grossPnl === "" ? null : Number(out.grossPnl);
    if (g === null || !Number.isFinite(g)) delete out.grossPnl;
    else {
      out.grossPnl = Math.round(g * 100) / 100;
      out.pnl = Math.round((g - Number(out.fees || 0)) * 100) / 100;
    }
  }
  // setupChecks: { done, total } with 0 ≤ done ≤ total ≤ 50, or null
  if ("setupChecks" in out) {
    const v = out.setupChecks as { done?: unknown; total?: unknown } | null;
    const done = Number(v?.done), total = Number(v?.total);
    out.setupChecks = v && Number.isInteger(done) && Number.isInteger(total) && done >= 0 && total > 0 && done <= total && total <= 50
      ? { done, total } : null;
  }
  // accounts: unique account ids only
  if ("accounts" in out) {
    const ids = Array.isArray(out.accounts) ? out.accounts : [];
    out.accounts = Array.from(new Set(ids.filter((x): x is string => typeof x === "string" && /^[a-f0-9]{24}$/i.test(x))));
  }
  return out;
}

// Trade dates are stored and compared as "YYYY-MM-DD" strings; anything else breaks sorting.
export function isDateKey(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
