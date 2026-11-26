// Prop firm accounts: stats, rules, status, delete, backup/restore keeping links.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, Stack } from "../helpers/stack";
import { downloadFullBackup, restoreFullBackup } from "@/lib/backupClient";

let s: Stack;
before(async () => { s = await startStack(); s.patchGlobalFetch(); });
after(async () => { await s?.stop(); });

const base = { pair: "MNQ", type: "BUY", lot: 1, entry: 1, exit: 2, propFirm: "Lucid" };
let A: any, B: any;

test("create accounts and copier trades", async () => {
  assert.equal((await s.json("/api/accounts", { propFirm: "Lucid", name: "x", size: 0, startDate: "2026-11-01" })).success, false);
  A = (await s.json("/api/accounts", { propFirm: "Lucid", name: "50K #1", size: 50000, startDate: "2026-10-30", fee: 150 })).data;
  B = (await s.json("/api/accounts", { propFirm: "Lucid", name: "50K #2", size: 50000, startDate: "2026-10-30", status: "funded" })).data;
  await s.json("/api/accounts", { propFirm: "Tradify", name: "100K", size: 100000, startDate: "2026-10-30" });

  await s.json("/api/trades", { ...base, date: "2026-11-01", time: "10:00", pnl: 500, accounts: [A._id, B._id, "not-an-id"] });
  await s.json("/api/trades", { ...base, date: "2026-11-02", time: "10:00", pnl: -800, accounts: [A._id, B._id] });
  await s.json("/api/trades", { ...base, date: "2026-11-03", time: "10:00", pnl: 300, accounts: [A._id] });
  await s.json("/api/trades", { ...base, date: "2026-11-03", time: "11:00", pnl: 999 });
  await s.json(`/api/accounts/${B._id}/txns`, { type: "payout", amount: 200, date: "2026-11-02" });

  const t1 = (await s.json("/api/trades?limit=10")).data.find((t: any) => t.pnl === 500);
  assert.deepEqual(t1.accounts, [A._id, B._id]);
});

test("per-account stats", async () => {
  const lucid = (await s.json("/api/accounts?propFirm=Lucid")).data;
  assert.equal(lucid.length, 2);
  const a = lucid.find((x: any) => x._id === A._id), b = lucid.find((x: any) => x._id === B._id);
  assert.deepEqual([a.pnl, a.balance, a.peakBalance, a.maxDrawdown, a.trades, a.fees, a.net], [0, 50000, 50500, 800, 3, 150, -150]);
  assert.deepEqual([b.pnl, b.payouts, b.balance, b.maxDrawdown, b.trades, b.net], [-300, 200, 49500, 800, 2, 200]);
  const firm = (await s.json("/api/propfirm-accounts?propFirm=Lucid")).data;
  assert.ok(firm.some((t: any) => t.type === "investment" && t.amount === 150));
  assert.ok(firm.some((t: any) => t.type === "payout" && t.amount === 200));
});

test("status history and rules", async () => {
  await s.json(`/api/accounts/${A._id}`, { status: "failed", statusDate: "2026-11-04" }, "PATCH");
  assert.equal((await s.json(`/api/accounts/${A._id}`, { status: "won" }, "PATCH")).success, false);
  assert.equal((await s.json(`/api/accounts/${A._id}`, { rules: { drawdownType: "eod_trailing", maxDrawdown: 0 } }, "PATCH")).success, false);
  await s.json(`/api/accounts/${A._id}`, { rules: { drawdownType: "eod_trailing", maxDrawdown: "2000", lockAt: "50000", dailyLossLimit: "1000" } }, "PATCH");
  const a = (await s.json("/api/accounts")).data.find((x: any) => x._id === A._id);
  assert.equal(a.status, "failed");
  assert.deepEqual(a.statusHistory.map((h: any) => h.date), ["2026-10-30", "2026-11-04"]);
  assert.deepEqual([a.check.floor, a.check.room, a.check.level], [48500, 1500, "ok"]);
});

test("restore keeps account ids and links; delete unlinks", async () => {
  const backup = await downloadFullBackup(() => {});
  assert.equal(backup.data.accounts.length, 3);
  await s.json("/api/accounts", { propFirm: "Lucid", name: "temp", size: 1000, startDate: "2026-11-05" });
  await restoreFullBackup(JSON.parse(JSON.stringify(backup)), () => {});
  const restored = (await s.json("/api/accounts")).data;
  const ra = restored.find((x: any) => x._id === A._id);
  assert.equal(restored.length, 3);
  assert.deepEqual([ra.maxDrawdown, ra.fees, ra.trades], [800, 150, 3]);

  await s.api(`/api/accounts/${B._id}`, { method: "DELETE" });
  const trades = (await s.json("/api/trades?limit=10")).data;
  assert.equal(trades.length, 4);
  assert.ok(trades.every((t: any) => !(t.accounts || []).includes(B._id)));
  assert.ok(!(await s.json("/api/propfirm-accounts")).data.some((t: any) => t.accountId === B._id));

  const old = JSON.parse(JSON.stringify(backup));
  delete old.data.accounts;
  const counts = await restoreFullBackup(old, () => {});
  assert.deepEqual([counts.accounts, counts.trades], [0, 4]);
});

test("commission: net P&L on new trades, one-off apply to older ones", async () => {
  const C = (await s.json("/api/accounts", { propFirm: "Lucid", name: "50K #3", size: 50000, startDate: "2026-11-01", commissionPerContract: 1.5 })).data;
  assert.equal(C.commissionPerContract, 1.5);
  // an older trade, saved before fees existed
  await s.json("/api/trades", { ...base, date: "2026-11-02", lot: 4, pnl: 100, accounts: [C._id] });
  // a new trade from the form: gross + fees
  const t2 = (await s.json("/api/trades", { ...base, date: "2026-11-03", lot: 2, grossPnl: 50, fees: 3, pnl: 0, accounts: [C._id] })).data;
  assert.deepEqual([t2.grossPnl, t2.fees, t2.pnl], [50, 3, 47]);

  const r1 = await s.json(`/api/accounts/${C._id}/apply-commission`, {});
  assert.equal(r1.updated, 1);
  const again = await s.json(`/api/accounts/${C._id}/apply-commission`, {});
  assert.equal(again.updated, 0, "running twice changes nothing");
  const old = (await s.json("/api/trades?limit=50")).data.find((t: any) => t.date === "2026-11-02" && (t.accounts || []).includes(C._id));
  assert.deepEqual([old.grossPnl, old.fees, old.pnl], [100, 6, 94]);

  const c = (await s.json("/api/accounts")).data.find((x: any) => x._id === C._id);
  assert.equal(c.pnl, 141); // 94 + 47, stats use net
});
