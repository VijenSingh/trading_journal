// Prop firm rule checks for one account. Pure (no DB, no Date.now) so it is unit-tested.
//
// Drawdown, "EOD trailing": after each trading day the end-of-day equity can raise the
// high-water mark; the floor is high-water mark − maxDrawdown, it never moves down, and it
// stops rising once it reaches lockAt (if set). Equity is checked against the floor after
// every trade, since a firm closes the account the moment equity touches it.
// Equity = size + Σ trade P&L. Payouts are left out: a payout lowers the balance and the
// firm's floor together, so it never counts toward a breach.

export interface AccountRules {
  drawdownType: "none" | "eod_trailing";
  maxDrawdown: number;
  lockAt: number | null;
  dailyLossLimit: number;
  profitTarget: number;
  consistencyPct: number;
}

export const EMPTY_RULES: AccountRules = {
  drawdownType: "none", maxDrawdown: 0, lockAt: null, dailyLossLimit: 0, profitTarget: 0, consistencyPct: 0,
};

// Cleans rules from a request body; returns null if a value is invalid.
export function sanitizeRules(input: unknown): AccountRules | null {
  if (!input || typeof input !== "object") return null;
  const b = input as Record<string, unknown>;
  const num = (v: unknown) => (v === "" || v == null ? 0 : Number(v));
  const out: AccountRules = {
    drawdownType: b.drawdownType === "eod_trailing" ? "eod_trailing" : "none",
    maxDrawdown: num(b.maxDrawdown),
    lockAt: b.lockAt === "" || b.lockAt == null ? null : Number(b.lockAt),
    dailyLossLimit: num(b.dailyLossLimit),
    profitTarget: num(b.profitTarget),
    consistencyPct: num(b.consistencyPct),
  };
  const nums = [out.maxDrawdown, out.dailyLossLimit, out.profitTarget, out.consistencyPct, out.lockAt ?? 0];
  if (nums.some(v => !Number.isFinite(v) || v < 0) || out.consistencyPct > 100) return null;
  if (out.drawdownType === "eod_trailing" && !(out.maxDrawdown > 0)) return null;
  return out;
}

export type RuleLevel = "ok" | "warn" | "breach";

export interface RuleCheck {
  level: RuleLevel;               // worst of the checks below
  messages: string[];             // short Hinglish lines for warn/breach
  // drawdown
  floor: number | null;           // current floor balance
  equity: number;                 // size + Σ P&L
  room: number | null;            // equity − floor
  ddUsedPct: number | null;       // share of maxDrawdown used up (0–100+)
  ddBreachedOn: string | null;    // first date equity touched the floor
  // daily loss
  todayPnl: number;
  dailyRoom: number | null;       // how much more can be lost today
  dailyUsedPct: number | null;
  dailyBreaches: string[];        // days whose P&L reached −dailyLossLimit
  // profit target
  targetProgressPct: number | null;
  targetRemaining: number | null;
  // consistency
  bestDayPnl: number;
  bestDaySharePct: number | null; // best day as % of total profit
  consistencyOk: boolean | null;
  consistencyProfitNeeded: number | null; // total profit needed for the best day to fit
}

export interface TradeEvent { date: string; time: string; pnl: number }

const WARN_AT = 80; // % of a limit used

export function evaluateRules(size: number, rules: AccountRules | undefined, trades: TradeEvent[], today: string): RuleCheck {
  const r = { ...EMPTY_RULES, ...(rules || {}) };
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const messages: string[] = [];
  let level: RuleLevel = "ok";
  const raise = (l: RuleLevel, msg: string) => {
    messages.push(msg);
    if (l === "breach" || (l === "warn" && level === "ok")) level = l;
  };

  // per-day P&L
  const dayPnl = new Map<string, number>();
  for (const t of sorted) dayPnl.set(t.date, (dayPnl.get(t.date) || 0) + t.pnl);
  const total = sorted.reduce((s, t) => s + t.pnl, 0);
  const equity = size + total;

  // ── EOD trailing drawdown ──
  let floor: number | null = null, room: number | null = null, ddUsedPct: number | null = null, ddBreachedOn: string | null = null;
  if (r.drawdownType === "eod_trailing" && r.maxDrawdown > 0) {
    const cap = (f: number) => (r.lockAt != null ? Math.min(f, r.lockAt) : f);
    let hwm = size;
    floor = cap(hwm - r.maxDrawdown);
    let eq = size, day = sorted[0]?.date;
    for (const t of sorted) {
      if (t.date !== day) {                    // previous day closed at eq
        hwm = Math.max(hwm, eq);
        floor = Math.max(floor!, cap(hwm - r.maxDrawdown));
        day = t.date;
      }
      eq += t.pnl;
      if (!ddBreachedOn && eq <= floor!) ddBreachedOn = t.date;
    }
    // today's close is not in yet; earlier days are
    if (day && day < today) {
      hwm = Math.max(hwm, eq);
      floor = Math.max(floor!, cap(hwm - r.maxDrawdown));
    }
    room = equity - floor!;
    ddUsedPct = ((r.maxDrawdown - room) / r.maxDrawdown) * 100;
    if (ddBreachedOn) raise("breach", `Drawdown floor ${ddBreachedOn} ko touch hua`);
    else if (ddUsedPct >= WARN_AT) raise("warn", `Drawdown floor sirf $${r2(room).toLocaleString("en-US")} door`);
  }

  // ── daily loss limit ──
  const todayPnl = dayPnl.get(today) || 0;
  let dailyRoom: number | null = null, dailyUsedPct: number | null = null;
  const dailyBreaches: string[] = [];
  if (r.dailyLossLimit > 0) {
    for (const [d, p] of Array.from(dayPnl.entries())) if (p <= -r.dailyLossLimit) dailyBreaches.push(d);
    dailyRoom = r.dailyLossLimit + Math.min(0, todayPnl);
    dailyUsedPct = (Math.max(0, -todayPnl) / r.dailyLossLimit) * 100;
    if (todayPnl <= -r.dailyLossLimit) raise("breach", "Aaj ki daily loss limit hit — aaj trading band");
    else if (dailyUsedPct >= WARN_AT) raise("warn", `Aaj sirf $${r2(dailyRoom).toLocaleString("en-US")} aur loss ho sakta hai`);
  }

  // ── profit target ──
  let targetProgressPct: number | null = null, targetRemaining: number | null = null;
  if (r.profitTarget > 0) {
    targetProgressPct = (total / r.profitTarget) * 100;
    targetRemaining = Math.max(0, r.profitTarget - total);
  }

  // ── consistency: best day ≤ consistencyPct % of total profit ──
  const bestDayPnl = Math.max(0, ...Array.from(dayPnl.values()));
  let bestDaySharePct: number | null = null, consistencyOk: boolean | null = null, consistencyProfitNeeded: number | null = null;
  if (r.consistencyPct > 0 && bestDayPnl > 0) {
    bestDaySharePct = total > 0 ? (bestDayPnl / total) * 100 : null;
    consistencyOk = bestDaySharePct != null && bestDaySharePct <= r.consistencyPct;
    consistencyProfitNeeded = r2(bestDayPnl / (r.consistencyPct / 100));
    if (!consistencyOk) {
      raise("warn", `Consistency: best day $${r2(bestDayPnl).toLocaleString("en-US")} — total profit $${consistencyProfitNeeded.toLocaleString("en-US")} chahiye`);
    }
  }

  return {
    level, messages,
    floor: floor == null ? null : r2(floor), equity: r2(equity), room: room == null ? null : r2(room),
    ddUsedPct: ddUsedPct == null ? null : r2(ddUsedPct), ddBreachedOn,
    todayPnl: r2(todayPnl), dailyRoom: dailyRoom == null ? null : r2(dailyRoom),
    dailyUsedPct: dailyUsedPct == null ? null : r2(dailyUsedPct), dailyBreaches,
    targetProgressPct: targetProgressPct == null ? null : r2(targetProgressPct),
    targetRemaining: targetRemaining == null ? null : r2(targetRemaining),
    bestDayPnl: r2(bestDayPnl), bestDaySharePct: bestDaySharePct == null ? null : r2(bestDaySharePct),
    consistencyOk, consistencyProfitNeeded,
  };
}

// Would adding a trade with this P&L today break a rule? For the trade form's warning.
export function tradeWouldBreak(check: RuleCheck, rules: AccountRules | undefined, pnl: number): string | null {
  if (!(pnl < 0)) return null;
  const r = { ...EMPTY_RULES, ...(rules || {}) };
  if (check.room != null && check.room + pnl <= 0) return "drawdown floor toot jayega";
  if (r.dailyLossLimit > 0 && check.dailyRoom != null && check.dailyRoom + pnl <= 0) return "daily loss limit cross ho jayegi";
  return null;
}
