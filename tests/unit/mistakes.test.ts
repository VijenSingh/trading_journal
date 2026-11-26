import { test } from "node:test";
import assert from "node:assert/strict";
import { getMistakeCosts } from "@/lib/utils";
import type { Trade } from "@/lib/types";

const T = (pnl: number, mistakes: number[]): Trade => ({
  date: "2026-11-01", time: "10:00", pair: "MNQ", type: "BUY", lot: 1, entry: 100, sl: 90, target: 0, exit: 0,
  pnl, pips: 0, rr: 0, strategy: "", session: "", mistakes, emotion: "", reasoning: "", lesson: "", rulesFollowed: "", tags: [],
});

test("cost per mistake, clean average, and P&L without mistake trades", () => {
  const m = getMistakeCosts([T(-200, [1]), T(-100, [1, 4]), T(50, [4]), T(120, []), T(80, [])]);
  // MNQ: risk = 10 pts × $2 = $20 per contract
  assert.deepEqual(m.costs.map(c => [c.id, c.trades, c.pnl]), [[1, 2, -300], [4, 2, -50]]);
  assert.equal(m.costs[0].avgR, -7.5);
  assert.deepEqual([m.mistakeTrades, m.mistakePnl, m.cleanTrades, m.cleanAvgPnl], [3, -250, 2, 100]);
  assert.deepEqual([m.totalPnl, m.pnlWithoutMistakeTrades], [-50, 200]);
});

test("no mistakes → empty list", () => {
  const m = getMistakeCosts([T(10, []), T(-5, [])]);
  assert.deepEqual([m.costs.length, m.mistakeTrades, m.pnlWithoutMistakeTrades], [0, 0, 5]);
});
