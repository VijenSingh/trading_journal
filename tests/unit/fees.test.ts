import { test } from "node:test";
import assert from "node:assert/strict";
import { pickTradeFields } from "@/lib/tradeFields";
import { csvToTrades, tradesToCsv } from "@/lib/utils";
import type { Trade } from "@/lib/types";

test("server derives net P&L from gross − fees", () => {
  const b = pickTradeFields({ grossPnl: "120.5", fees: "4.98", pnl: 999 });
  assert.deepEqual([b.grossPnl, b.fees, b.pnl], [120.5, 4.98, 115.52]);
});

test("negative or junk fees become 0; pnl alone stays as sent", () => {
  assert.equal(pickTradeFields({ fees: -3 }).fees, 0);
  assert.equal(pickTradeFields({ fees: "abc" }).fees, 0);
  const b = pickTradeFields({ pnl: 50, fees: 2 });
  assert.deepEqual([b.pnl, b.fees, "grossPnl" in b], [50, 2, false]);
  const n = pickTradeFields({ pnl: 50, grossPnl: null });
  assert.equal("grossPnl" in n, false);
});

test("CSV carries fees; imported P&L is net", () => {
  const t = { date: "2026-11-01", time: "10:00", pair: "MNQ", type: "BUY", lot: 2, entry: 1, sl: 0, target: 0, exit: 2,
    pnl: 95.02, fees: 4.98, pips: 0, rr: 0, strategy: "", session: "", mistakes: [], emotion: "", reasoning: "", lesson: "", rulesFollowed: "", tags: [] } as Trade;
  const csv = tradesToCsv([t]);
  assert.ok(csv.split("\n")[0].includes(",P&L,Fees,"));
  const back = csvToTrades(csv, "").trades[0];
  assert.deepEqual([back.pnl, back.fees], [95.02, 4.98]);
});
