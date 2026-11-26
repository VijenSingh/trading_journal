import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csvToTrades, tradesToCsv, getAnalytics, compactUsd, formatPnl,
  tradeRisk, rMultiple, formatR, getRStats, getHourStats,
  holdMinutes, formatDuration, normalizeTime, getHoldStats,
} from "@/lib/utils";
import type { Trade } from "@/lib/types";

const T = (o: Partial<Trade>): Trade => ({
  date: "2026-11-01", time: "10:00", pair: "MNQ", type: "BUY", lot: 2, entry: 20000, sl: 19990, target: 0, exit: 20020,
  pnl: 80, pips: 0, rr: 0, strategy: "", session: "", mistakes: [], emotion: "", reasoning: "", lesson: "", rulesFollowed: "", tags: [], ...o,
});

test("CSV import: Indian formats parsed, bad cells reported not zeroed", () => {
  const csv = [
    "Date,Pair,P&L,Lot,Type",
    "2026-11-20,EURUSD,150,1,BUY",
    "21/11/2026,EURUSD,\"₹1,234.50\",1,SELL",
    "22-11-2026,GBPUSD,(200),1,BUY",
    "2026-11-23,GBPUSD,abc,1,BUY",
    "31/02/2026,GBPUSD,10,1,BUY",
    "2026-11-24,GBPUSD,10,x1,BUY",
  ].join("\n");
  const r = csvToTrades(csv, "Lucid");
  assert.equal(r.trades.length, 3);
  assert.deepEqual([r.trades[1].date, r.trades[1].pnl], ["2026-11-21", 1234.5]);
  assert.deepEqual([r.trades[2].date, r.trades[2].pnl], ["2026-11-22", -200]);
  assert.equal(r.errors.length, 3);
});

test("CSV round trip keeps risk and exit time", () => {
  const csv = tradesToCsv([T({ riskAmount: 40, exitTime: "10:45" })]);
  assert.ok(csv.startsWith("Date,Time,Exit Time,"));
  const back = csvToTrades(csv, "Lucid").trades[0];
  assert.equal(back.riskAmount, 40);
  assert.equal(back.exitTime, "10:45");
  const times = csvToTrades("Date,Time,Exit Time,Pair,P&L\n2026-11-01,9:05 AM,09:50:12,MNQ,10", "").trades[0];
  assert.deepEqual([times.time, times.exitTime], ["09:05", "09:50"]);
});

test("streaks: breakeven neutral, ordered by date and time", () => {
  const a = getAnalytics([
    T({ date: "2026-11-01", time: "10:00", pnl: 100 }), T({ date: "2026-11-01", time: "09:00", pnl: -50 }),
    T({ date: "2026-11-02", pnl: 0 }), T({ date: "2026-11-03", pnl: 80 }), T({ date: "2026-11-04", pnl: 60 }),
  ]);
  assert.equal(a.longestWinStreak, 3);
  assert.equal(a.longestLossStreak, 1);
});

test("money formatting", () => {
  assert.equal(compactUsd(-15234), "-$15k");
  assert.equal(compactUsd(450), "$450");
  assert.equal(compactUsd(1234), "$1.2k");
  assert.equal(compactUsd(1000), "$1k");
  assert.equal(formatPnl(21.25), "+$21.25");
  assert.equal(formatPnl(-1250), "-$1,250");
});

test("R-multiple", () => {
  assert.equal(tradeRisk(T({})), 40);
  assert.equal(rMultiple(T({})), 2);
  assert.equal(rMultiple(T({ riskAmount: 100 })), 0.8);
  assert.equal(rMultiple(T({ sl: 0 })), null);
  assert.equal(formatR(1.5), "+1.50R");
  const trades = [T({ pnl: 80 }), T({ pnl: -40, time: "10:30" }), T({ pnl: 120, time: "14:05" }), T({ pnl: -60, time: "14:40" }), T({ pnl: 50, sl: 0, time: "09:15" })];
  const r = getRStats(trades);
  assert.deepEqual([r.count, r.coverage, r.totalR, r.avgR, r.bestR, r.worstR], [4, 80, 2.5, 0.63, 3, -1.5]);
  const h = getHourStats(trades);
  assert.deepEqual(h.map(x => x.hour), [9, 10, 14]);
  assert.deepEqual([h[1].trades, h[1].pnl, h[1].winRate, h[1].avgR], [2, 40, 50, 0.5]);
});

test("holding time", () => {
  assert.equal(holdMinutes(T({ exitTime: "10:45" })), 45);
  assert.equal(holdMinutes(T({ time: "23:30", exitTime: "00:15" })), 45);
  assert.equal(holdMinutes(T({})), null);
  assert.equal(formatDuration(90), "1h 30m");
  assert.equal(normalizeTime("9:05 PM"), "21:05");
  assert.equal(normalizeTime("12:10 am"), "00:10");
  assert.equal(normalizeTime("25:00"), "");
  const s = getHoldStats([
    T({ exitTime: "10:03", pnl: 40, lot: 1 }), T({ exitTime: "10:10", pnl: 20 }),
    T({ exitTime: "11:30", pnl: -20 }), T({ exitTime: "12:00", pnl: -10 }), T({ pnl: 5 }),
  ]);
  assert.deepEqual([s.count, s.coverage, s.avgWin, s.avgLoss], [4, 80, 7, 105]);
  assert.deepEqual(s.buckets.map(b => b.label), ["< 5 min", "5–15 min", "1–2 ghante", "2–4 ghante"]);
});
