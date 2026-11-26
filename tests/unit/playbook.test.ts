import { test } from "node:test";
import assert from "node:assert/strict";
import { setupStats } from "@/lib/playbook";
import { pickTradeFields } from "@/lib/tradeFields";
import type { Trade } from "@/lib/types";

const T = (pnl: number, checks: { done: number; total: number } | null): Trade => ({
  date: "2026-11-01", time: "10:00", pair: "MNQ", type: "BUY", lot: 1, entry: 100, sl: 90, target: 0, exit: 0, pnl,
  pips: 0, rr: 0, strategy: "OB", session: "", mistakes: [], emotion: "", reasoning: "", lesson: "", rulesFollowed: "", tags: [], setupChecks: checks,
});

test("setup stats split A+ from partial checklists", () => {
  const s = setupStats([T(40, { done: 4, total: 4 }), T(20, { done: 4, total: 4 }), T(-20, { done: 2, total: 4 }), T(-40, { done: 3, total: 4 }), T(10, null)]);
  assert.deepEqual([s.trades, s.winRate, s.pnl], [5, 60, 10]);
  assert.deepEqual([s.aPlus.trades, s.aPlus.winRate, s.aPlus.avgPnl, s.aPlus.avgR], [2, 100, 30, 1.5]);
  assert.deepEqual([s.partial.trades, s.partial.winRate, s.partial.avgPnl, s.partial.avgR], [2, 0, -30, -1.5]);
});

test("setupChecks input is validated", () => {
  assert.deepEqual(pickTradeFields({ setupChecks: { done: 3, total: 4 } }).setupChecks, { done: 3, total: 4 });
  assert.equal(pickTradeFields({ setupChecks: { done: 5, total: 4 } }).setupChecks, null);
  assert.equal(pickTradeFields({ setupChecks: { done: 1.5, total: 4 } }).setupChecks, null);
  assert.equal(pickTradeFields({ setupChecks: "x" }).setupChecks, null);
});
