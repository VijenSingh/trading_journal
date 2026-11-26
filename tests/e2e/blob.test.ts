// Screenshots/certificates in Vercel Blob, migration, cloud backup. Talks to a REAL Blob
// store, so it only runs when asked: E2E_BLOB=1 and BLOB_READ_WRITE_TOKEN set. Everything
// it writes goes under a fresh e2e-test-<time>/ folder that is deleted at the end.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { list, del } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { startStack, Stack } from "../helpers/stack";
import { downloadFullBackup, restoreFullBackup } from "@/lib/backupClient";

const token = process.env.BLOB_READ_WRITE_TOKEN || "";
const enabled = process.env.E2E_BLOB === "1" && !!token;
const PREFIX = `e2e-test-${Date.now()}/`;
let s: Stack;
const under = async (p: string) => (await list({ prefix: PREFIX + p, limit: 1000, token })).blobs.map(b => b.pathname);

before(async () => {
  if (!enabled) return;
  s = await startStack({ BLOB_READ_WRITE_TOKEN: token, BLOB_PATH_PREFIX: PREFIX });
  s.patchGlobalFetch();
});
after(async () => {
  if (!enabled) return;
  await s?.stop();
  const left = (await list({ prefix: PREFIX, limit: 1000, token })).blobs.map(b => b.pathname);
  if (left.length) await del(left, { token });
});

const jpeg = (n: number, v: number) => Buffer.alloc(n * 1024, v);
const dataUrl = (b: Buffer) => "data:image/jpeg;base64," + b.toString("base64");
const base = { pair: "MNQ", type: "BUY", lot: 1, entry: 100, exit: 110, pnl: 20, propFirm: "Lucid" };

test("blob storage, migration, backup, restore", { skip: !enabled && "set E2E_BLOB=1 and BLOB_READ_WRITE_TOKEN to run" }, async () => {
  const A = jpeg(120, 1), B = jpeg(90, 2), C = jpeg(70, 3);
  const legacy: ObjectId[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await s.db.collection("trades").insertOne({ ...base, date: `2026-09-0${i + 1}`, time: "10:00", screenshot: dataUrl(A), mistakes: [], tags: [], createdAt: new Date(), updatedAt: new Date() });
    legacy.push(r.insertedId);
  }
  await s.db.collection("certificates").insertOne({ type: "payout", fileName: "old.pdf", mimeType: "application/pdf",
    fileData: "data:application/pdf;base64," + Buffer.from("%PDF-1.4 " + "x".repeat(50000)).toString("base64"), createdAt: new Date(), updatedAt: new Date() });

  // new upload goes to Blob
  const created = await s.json("/api/trades", { ...base, date: "2026-11-01", time: "09:00", screenshot: dataUrl(B) });
  const doc = await s.db.collection("trades").findOne({ _id: new ObjectId(created.data._id) });
  assert.equal(doc!.screenshot, "");
  assert.ok(doc!.screenshotPath.startsWith(PREFIX + "screenshots/"));
  const img = await s.api(`/api/trades/${created.data._id}/screenshot`);
  assert.ok(Buffer.from(await img.arrayBuffer()).equals(B));

  // edit: echo keeps, replace swaps and deletes old
  const single = await s.json(`/api/trades/${created.data._id}`);
  await s.json(`/api/trades/${created.data._id}`, { screenshot: single.data.screenshot, lesson: "x" }, "PATCH");
  assert.equal((await s.db.collection("trades").findOne({ _id: doc!._id }))!.screenshotPath, doc!.screenshotPath);
  await s.json(`/api/trades/${created.data._id}`, { screenshot: dataUrl(C) }, "PATCH");
  const replaced = await s.db.collection("trades").findOne({ _id: doc!._id });
  assert.ok(!(await under("screenshots/")).includes(doc!.screenshotPath));
  assert.ok((await under("screenshots/")).includes(replaced!.screenshotPath));

  // migration is gated on a recent cloud backup
  const gated = await s.api("/api/backups/migrate", { method: "POST" });
  assert.equal(gated.status, 409);
  const cb = await s.json("/api/backups", {});
  assert.ok(cb.success);
  const dl = await s.api(`/api/backups?download=${encodeURIComponent(cb.pathname)}`);
  assert.equal(dl.status, 302);
  const mig = await s.json("/api/backups/migrate", {});
  assert.equal(mig.moved, 4);
  assert.deepEqual(mig.remaining, { screenshots: 0, certificates: 0 });
  const moved = await s.api(`/api/trades/${legacy[0]}/screenshot`);
  assert.ok(Buffer.from(await moved.arrayBuffer()).equals(A));

  // backups stay self-contained; restore deletes replaced files
  const full = await downloadFullBackup(() => {});
  assert.equal(full.data.trades.filter((t: any) => t.screenshot === dataUrl(A)).length, 3);
  await restoreFullBackup(full, () => {});
  assert.equal((await under("screenshots/")).length + (await under("certificates/")).length, 0);
  assert.equal((await s.json("/api/backups/migrate", {})).moved, 5);

  await s.api("/api/trades/clear", { method: "DELETE" });
  assert.equal((await under("screenshots/")).length, 0);
});
