// Playbook setups: CRUD, stats from tagged trades, rename moves trades, backup/restore.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, Stack } from "../helpers/stack";
import { downloadFullBackup, restoreFullBackup } from "@/lib/backupClient";

let s: Stack;
before(async () => { s = await startStack(); s.patchGlobalFetch(); });
after(async () => { await s?.stop(); });

const img = "data:image/jpeg;base64," + Buffer.alloc(20 * 1024, 5).toString("base64");
const base = { pair: "MNQ", type: "BUY", lot: 1, entry: 100, sl: 90, exit: 110, propFirm: "Lucid" };

test("create, validate, stats, rename, images, backup", async () => {
  assert.equal((await s.json("/api/playbook", { name: "" })).success, false);
  const pdf = await s.json("/api/playbook", { name: "X", images: ["data:application/pdf;base64,JVBERg=="] });
  assert.equal(pdf.success, false, "PDF not allowed as example image");

  const ob = (await s.json("/api/playbook", { name: "Order Block", description: "OB retest", checklist: ["HTF trend", "OB untouched", "", "RR ≥ 2"], images: [img] })).data;
  assert.ok(ob._id);
  const dup = await s.api("/api/playbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Order Block" }) });
  assert.equal(dup.status, 409);

  await s.json("/api/trades", { ...base, date: "2026-11-01", pnl: 40, strategy: "Order Block", setupChecks: { done: 3, total: 3 } });
  await s.json("/api/trades", { ...base, date: "2026-11-02", pnl: -20, strategy: "Order Block", setupChecks: { done: 1, total: 3 } });
  await s.json("/api/trades", { ...base, date: "2026-11-03", pnl: 99, strategy: "Other" });

  const list = (await s.json("/api/playbook")).data;
  const st = list.find((x: any) => x._id === ob._id);
  assert.deepEqual(st.checklist, ["HTF trend", "OB untouched", "RR ≥ 2"]);
  assert.equal(st.imageCount, 1);
  assert.equal(st.images, undefined, "list carries no image data");
  assert.deepEqual([st.stats.trades, st.stats.pnl, st.stats.aPlus.trades, st.stats.partial.trades], [2, 20, 1, 1]);

  const image = await s.api(`/api/playbook/${ob._id}/image/0`);
  assert.equal(image.headers.get("content-type"), "image/jpeg");

  const ren = await s.json(`/api/playbook/${ob._id}`, { name: "OB Retest" }, "PATCH");
  assert.equal(ren.movedTrades, 2);
  const trades = (await s.json("/api/trades?limit=10")).data;
  assert.equal(trades.filter((t: any) => t.strategy === "OB Retest").length, 2);

  const backup = await downloadFullBackup(() => {});
  assert.equal(backup.data.setups.length, 1);
  assert.equal(backup.data.setups[0].images[0].data, img, "backup has the example image");
  await s.api(`/api/playbook/${ob._id}`, { method: "DELETE" });
  assert.equal((await s.json("/api/playbook")).data.length, 0);
  await restoreFullBackup(backup, () => {});
  const back = (await s.json("/api/playbook")).data;
  assert.deepEqual([back.length, back[0].name, back[0].imageCount, back[0].stats.trades], [1, "OB Retest", 1, 2]);
});
