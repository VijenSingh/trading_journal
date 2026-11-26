// Auth, trades, screenshots, certificates, backup and restore against the built app.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, Stack } from "../helpers/stack";
import { downloadFullBackup, restoreFullBackup } from "@/lib/backupClient";

let s: Stack;
before(async () => { s = await startStack(); s.patchGlobalFetch(); });
after(async () => { await s?.stop(); });

const base = { pair: "EURUSD", type: "BUY", lot: 1, entry: 1.1, exit: 1.2, pnl: 100, propFirm: "Lucid" };
const shot = "data:image/jpeg;base64," + Buffer.alloc(150 * 1024, 7).toString("base64");

test("auth: cookie required, wrong password rejected", async () => {
  const saved = s.cookie;
  s.cookie = "";
  assert.equal((await s.api("/api/trades")).status, 401);
  assert.equal((await s.login("wrong")).status, 401);
  assert.equal((await s.login()).status, 200);
  assert.notEqual(s.cookie, "");
  assert.ok(saved);
});

test("trades: validation and field whitelist", async () => {
  const bad = await s.api("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...base, date: "21/11/2026" }) });
  assert.equal(bad.status, 400);
  const created = await s.json("/api/trades", { ...base, date: "2026-10-02", _id: "000000000000000000000001", foo: "bar" });
  assert.ok(created.success);
  assert.notEqual(created.data._id, "000000000000000000000001");
  assert.equal(created.data.foo, undefined);
  const patch = await s.api(`/api/trades/${created.data._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "HOLD" }) });
  assert.equal(patch.status, 500);
});

test("lists never carry screenshots; images come from their own URL", async () => {
  for (let i = 0; i < 30; i++) {
    const r = await s.json("/api/trades", { ...base, date: `2026-10-${String((i % 28) + 1).padStart(2, "0")}`, time: "10:00", screenshot: shot, pnl: i });
    assert.ok(r.success);
  }
  const res = await s.api("/api/trades?limit=500");
  const text = await res.text();
  assert.ok(text.length < 200 * 1024, `list is ${text.length} bytes`);
  const list = JSON.parse(text);
  const withShot = list.data.filter((t: any) => t.hasScreenshot);
  assert.equal(withShot.length, 30);
  assert.ok(list.data.every((t: any) => t.screenshot === undefined));
  const img = await s.api(`/api/trades/${withShot[0]._id}/screenshot`);
  assert.equal(img.headers.get("content-type"), "image/jpeg");
  assert.equal((await img.arrayBuffer()).byteLength, 150 * 1024);
});

test("certificates: only images and PDFs", async () => {
  const html = await s.api("/api/certificates", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "payout", fileData: "data:text/html;base64,PHNjcmlwdD4=", mimeType: "text/html" }) });
  assert.equal(html.status, 400);
  const pdf = await s.json("/api/certificates", { type: "payout", fileName: "a.pdf", mimeType: "application/pdf",
    fileData: "data:application/pdf;base64," + Buffer.alloc(500 * 1024, 1).toString("base64") });
  assert.ok(pdf.success);
});

test("backup and restore: full round trip, rollback on bad data, refuses partial uploads", async () => {
  const meta = await (await s.api("/api/backup")).text();
  assert.ok(meta.length < 1024 * 1024, "step-1 backup stays small");
  const backup = await downloadFullBackup(() => {});
  assert.equal(backup.data.trades.filter((t: any) => t.screenshot === shot).length, 30);
  assert.ok(backup.data.certificates[0].fileData.startsWith("data:application/pdf"));
  const before = backup.data.trades.length;

  await s.json("/api/trades", { ...base, date: "2026-11-01" });
  const counts = await restoreFullBackup(JSON.parse(JSON.stringify(backup)), () => {});
  assert.equal(counts.trades, before);
  assert.equal((await s.json("/api/trades?limit=1")).total, before);

  const broken = JSON.parse(JSON.stringify(backup));
  broken.data.trades.push({ ...base, date: "2026-12-01", type: "HOLD" });
  await assert.rejects(restoreFullBackup(broken, () => {}), /purana data/);
  assert.equal((await s.json("/api/trades?limit=1")).total, before);

  const begin = await s.json("/api/backup/restore", { action: "begin", expected: { trades: 5 } });
  await s.json("/api/backup/restore", { action: "chunk", restoreId: begin.restoreId, collection: "trades", seq: 0, docs: [base, base] });
  const commit = await s.api("/api/backup/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "commit", restoreId: begin.restoreId }) });
  assert.equal(commit.status, 400);
  assert.equal((await s.json("/api/trades?limit=1")).total, before);
});

test("cron backup refuses without the secret", async () => {
  const r = await fetch(s.base + "/api/cron/backup");
  assert.equal(r.status, 401);
});

test("auth fails closed when unconfigured, and a password change logs everyone out", async () => {
  await s.restart({ AUTH_PASSWORD: "", AUTH_SECRET: "" });
  assert.equal((await fetch(s.base + "/api/trades")).status, 503);
  const old = s.cookie;
  await s.restart({ AUTH_PASSWORD: "another-password" });
  assert.equal((await fetch(s.base + "/api/trades", { headers: { cookie: old } })).status, 401);
});
