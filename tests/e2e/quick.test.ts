// Quick trade page, share-target fallback and manifest.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, Stack } from "../helpers/stack";

let s: Stack;
before(async () => { s = await startStack(); });
after(async () => { await s?.stop(); });

test("manifest declares the share target and shortcuts", async () => {
  const m = await (await fetch(s.base + "/manifest.json")).json();
  assert.equal(m.share_target.action, "/share-target");
  assert.equal(m.share_target.method, "POST");
  assert.equal(m.share_target.params.files[0].name, "screenshot");
  assert.ok(m.shortcuts.some((x: any) => x.url === "/trade/quick"));
});

test("service worker handles the share target", async () => {
  const sw = await (await fetch(s.base + "/sw.js")).text();
  assert.ok(sw.includes('"/share-target"') && sw.includes("tradermind-share"));
});

test("share-target fallback (no service worker) opens quick trade", async () => {
  const fd = new FormData();
  fd.append("title", "chart");
  const r = await s.api("/share-target", { method: "POST", body: fd });
  assert.equal(r.status, 303);
  assert.match(r.headers.get("location") || "", /\/trade\/quick\?share=nosw$/);
});

test("quick trade page renders", async () => {
  const r = await s.api("/trade/quick");
  assert.equal(r.status, 200);
  assert.ok((await r.text()).includes("Quick Trade"));
});
