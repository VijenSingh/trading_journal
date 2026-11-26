import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateRules, tradeWouldBreak, sanitizeRules, EMPTY_RULES, AccountRules } from "@/lib/accountRules";
import { computeAccountStats } from "@/lib/accountStats";
import { pickTradeFields, isDateKey } from "@/lib/tradeFields";

const R = (o: Partial<AccountRules>): AccountRules => ({ ...EMPTY_RULES, ...o });
const T = (date: string, pnl: number, time = "10:00") => ({ date, time, pnl });

test("EOD trailing floor rises with day highs and locks", () => {
  const c = evaluateRules(50000, R({ drawdownType: "eod_trailing", maxDrawdown: 2000, lockAt: 50000 }),
    [T("2026-11-01", 1000), T("2026-11-02", 1500), T("2026-11-03", -1000), T("2026-11-04", -400)], "2026-11-04");
  assert.deepEqual([c.floor, c.equity, c.room, c.ddUsedPct, c.level], [50000, 51100, 1100, 45, "ok"]);
});

test("breach found after the touching trade; intraday peaks don't raise the floor", () => {
  const c = evaluateRules(50000, R({ drawdownType: "eod_trailing", maxDrawdown: 2000 }),
    [T("2026-11-01", 3000, "09:00"), T("2026-11-01", -2500, "10:00"), T("2026-11-02", -1000, "09:00"), T("2026-11-02", -1100, "10:00")], "2026-11-05");
  assert.equal(c.ddBreachedOn, "2026-11-02");
  assert.equal(c.level, "breach");
});

test("today's open day does not move the floor", () => {
  const rules = R({ drawdownType: "eod_trailing", maxDrawdown: 2000 });
  assert.equal(evaluateRules(50000, rules, [T("2026-11-04", 2000)], "2026-11-04").floor, 48000);
  assert.equal(evaluateRules(50000, rules, [T("2026-11-04", 2000)], "2026-11-05").floor, 50000);
});

test("daily loss limit and trade-form warning", () => {
  const rules = R({ dailyLossLimit: 1000 });
  const c = evaluateRules(50000, rules, [T("2026-11-03", -1200), T("2026-11-04", -500), T("2026-11-04", -350, "11:00")], "2026-11-04");
  assert.deepEqual([c.todayPnl, c.dailyRoom, c.dailyUsedPct, c.level], [-850, 150, 85, "warn"]);
  assert.deepEqual(c.dailyBreaches, ["2026-11-03"]);
  assert.equal(tradeWouldBreak(c, rules, -200), "daily loss limit cross ho jayegi");
  assert.equal(tradeWouldBreak(c, rules, -100), null);
});

test("consistency and target", () => {
  const c = evaluateRules(50000, R({ consistencyPct: 50, profitTarget: 3000 }),
    [T("2026-11-01", 1000), T("2026-11-02", 300), T("2026-11-03", 200)], "2026-11-04");
  assert.equal(c.consistencyOk, false);
  assert.equal(c.consistencyProfitNeeded, 2000);
  assert.deepEqual([c.targetProgressPct, c.targetRemaining], [50, 1500]);
});

test("rules input validation", () => {
  assert.equal(sanitizeRules({ drawdownType: "eod_trailing", maxDrawdown: "" }), null);
  assert.equal(sanitizeRules({ consistencyPct: 120 }), null);
  assert.deepEqual(sanitizeRules({ drawdownType: "eod_trailing", maxDrawdown: "2000", lockAt: "" }),
    { drawdownType: "eod_trailing", maxDrawdown: 2000, lockAt: null, dailyLossLimit: 0, profitTarget: 0, consistencyPct: 0 });
});

test("account stats: balance, drawdown, payouts", () => {
  const acc = { _id: "a1", propFirm: "Lucid", name: "50K", size: 50000, startDate: "2026-10-30", status: "funded" as const, statusHistory: [], notes: "" };
  const [s] = computeAccountStats([acc],
    [{ date: "2026-11-01", pnl: 500, accounts: ["a1"] }, { date: "2026-11-02", pnl: -800, accounts: ["a1"] }, { date: "2026-11-02", pnl: 999, accounts: ["other"] }],
    [{ accountId: "a1", type: "payout", amount: 200, date: "2026-11-02" }, { accountId: "a1", type: "investment", amount: 150, date: "2026-10-30" }],
    "2026-11-05");
  assert.deepEqual([s.pnl, s.balance, s.peakBalance, s.maxDrawdown, s.payouts, s.fees, s.net, s.trades], [-300, 49500, 50500, 800, 200, 150, 50, 2]);
});

test("trade input whitelist", () => {
  const b = pickTradeFields({ date: "2026-11-01", _id: "x", foo: 1, exitTime: "9:5", accounts: ["0123456789abcdef01234567", "bad", "0123456789abcdef01234567"] });
  assert.deepEqual(Object.keys(b).sort(), ["accounts", "date", "exitTime"]);
  assert.equal(b.exitTime, "");
  assert.deepEqual(b.accounts, ["0123456789abcdef01234567"]);
  assert.equal(isDateKey("2026-02-31"), false);
  assert.equal(isDateKey("2026-02-28"), true);
});
