import { test } from "node:test";
import assert from "node:assert/strict";
import { calcPnl, calcPositionSize, calcRisk } from "@/lib/instruments";

test("P&L per instrument", () => {
  assert.equal(calcPnl("NQ", "BUY", 20000, 20010, 1), 200);
  assert.equal(calcPnl("MNQ", "SELL", 20010, 20000, 3), 60);
  assert.equal(calcPnl("ES", "BUY", 6000, 5995, 2), -500);
  assert.equal(calcPnl("MES", "BUY", 6000, 6004.25, 1), 21.25);
  assert.equal(calcPnl("GC", "BUY", 2000, 2010, 1), 1000);
  assert.equal(calcPnl("XAUUSD (Gold)", "BUY", 2000, 2010, 1), 1000);
  assert.equal(calcPnl("EURUSD", "BUY", 1.1, 1.105, 1), 500);
  assert.equal(calcPnl("USDJPY", "SELL", 150, 149.5, 1), 455);
  assert.equal(calcPnl("USOIL", "BUY", 70, 70.5, 1), 500);
});

test("unknown pair gets no guessed P&L", () => {
  assert.equal(calcPnl("NIFTY", "BUY", 24000, 24100, 1), null);
});

test("position size: whole contracts for futures, 0.01 lots otherwise", () => {
  assert.equal(calcPositionSize("NQ", 500, 10), 2);
  assert.equal(calcPositionSize("MNQ", 500, 30), 8);
  assert.equal(calcPositionSize("NQ", 100, 10), 0);
  assert.equal(calcPositionSize("EURUSD", 100, 0.002), 0.5);
  assert.equal(calcPositionSize("EURUSD", 50, 1.105 - 1.1), 0.1); // float noise must not cut a step
});

test("risk from stop", () => {
  assert.equal(calcRisk("MNQ", 20000, 19990, 2), 40);
  assert.equal(calcRisk("MNQ", 20000, 0, 2), null);
  assert.equal(calcRisk("NIFTY", 100, 90, 1), null);
});
