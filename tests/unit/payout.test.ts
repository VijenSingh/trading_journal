import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePayout, EMPTY_RULES, AccountRules } from "@/lib/accountRules";

const R = (o: Partial<AccountRules>): AccountRules => ({ ...EMPTY_RULES, ...o });
const T = (date: string, pnl: number) => ({ date, time: "10:00", pnl });

test("no payout rules → inactive", () => {
  const p = evaluatePayout(50000, R({}), [T("2026-11-01", 500)], []);
  assert.equal(p.active, false);
  assert.equal(p.summary, "");
});

test("days that count need the minimum day profit", () => {
  const p = evaluatePayout(50000, R({ minTradingDays: 5, minDayProfit: 150 }),
    [T("2026-11-01", 200), T("2026-11-02", 100), T("2026-11-03", 300), T("2026-11-04", -50)], []);
  assert.deepEqual([p.daysCounted, p.daysNeeded, p.eligible], [2, 3, false]);
  assert.equal(p.summary, "Payout ke liye: 3 din aur");
});

test("buffer and consistency: missing profit is the larger of the two", () => {
  const p = evaluatePayout(50000, R({ payoutBuffer: 2100, consistencyPct: 40 }),
    [T("2026-11-01", 1000), T("2026-11-02", 300), T("2026-11-03", 200)], []);
  // balance 51500 → buffer needs 600 more; best day 1000 needs total 2500 → 1000 more
  assert.deepEqual([p.bufferProfitNeeded, p.consistencyProfitNeeded], [600, 1000]);
  assert.equal(p.summary, "Payout ke liye: $1,000 aur profit");
});

test("the cycle restarts after a payout, and the payout lowers the balance", () => {
  const trades = [T("2026-11-01", 1500), T("2026-11-02", 1200), T("2026-11-05", 400), T("2026-11-06", 350)];
  const p = evaluatePayout(50000, R({ minTradingDays: 2, payoutBuffer: 1000 }), trades, [{ date: "2026-11-03", amount: 1500 }]);
  // cycle = 11-05, 11-06 → 2 days, profit 750; balance 50000 + 3450 − 1500 = 51950 ≥ 51000
  assert.deepEqual([p.cycleStart, p.daysCounted, p.cycleProfit, p.bufferProfitNeeded, p.eligible], ["2026-11-03", 2, 750, 0, true]);
  assert.equal(p.summary, "✅ Payout eligible");
});

test("a losing cycle is never eligible", () => {
  const p = evaluatePayout(50000, R({ minTradingDays: 1 }), [T("2026-11-01", -100)], []);
  assert.equal(p.eligible, false);
});
