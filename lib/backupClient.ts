"use client";

// Vercel rejects request/response bodies over 4.5MB, so backup and restore move data
// in pieces. The downloaded file is the same full version-1 JSON as always, so backups
// taken before this change still restore.

const CHUNK_BYTES = 3 * 1024 * 1024; // stays clear of the 4.5MB cap after JSON overhead
const PARALLEL = 4;

type Progress = (msg: string) => void;

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

export async function downloadFullBackup(onProgress: Progress) {
  onProgress("Data load ho raha hai…");
  const backup = await getJson("/api/backup");
  const { trades, certificates } = backup.data as { trades: any[]; certificates: any[] };
  const setups: any[] = backup.data.setups || [];

  const jobs: { kind: "trade" | "certificate" | "setup"; doc: any }[] = [
    ...trades.filter(t => t._hasScreenshot).map(doc => ({ kind: "trade" as const, doc })),
    ...certificates.map(doc => ({ kind: "certificate" as const, doc })),
    ...setups.map(doc => ({ kind: "setup" as const, doc })),
  ];
  let done = 0;
  await mapLimit(jobs, PARALLEL, async ({ kind, doc }) => {
    const { value } = await getJson(`/api/backup/item?kind=${kind}&id=${doc._id}`);
    if (kind === "trade") doc.screenshot = value;
    else if (kind === "setup") doc.images = value;
    else doc.fileData = value;
    done++;
    onProgress(`Files download ho rahi hain… ${done}/${jobs.length}`);
  });
  for (const t of trades) { if (!t._hasScreenshot) t.screenshot = t.screenshot ?? ""; delete t._hasScreenshot; }
  for (const c of certificates) delete c.fileSize;
  delete backup.partial;
  delete backup.success;
  return backup;
}

const COLLECTIONS = ["trades", "propFirms", "dailyMistakes", "goals", "transactions", "accountTxns", "rules", "pairs", "certificates", "accounts", "setups"] as const;

export async function restoreFullBackup(backup: any, onProgress: Progress) {
  const data = backup?.data;
  if (backup?.version !== 1 || !data || !Array.isArray(data.trades)) throw new Error("Invalid ya purani backup file");

  const expected: Record<string, number> = {};
  for (const name of COLLECTIONS) expected[name] = Array.isArray(data[name]) ? data[name].length : 0;
  const { restoreId } = await getJson("/api/backup/restore", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "begin", expected }),
  });

  // Group docs into chunks under CHUNK_BYTES each (a single bigger doc goes on its own;
  // uploads were already capped below 4.5MB, so it still fits).
  const enc = new TextEncoder();
  const chunks: { collection: string; seq: number; docs: unknown[] }[] = [];
  for (const name of COLLECTIONS) {
    const docs: unknown[] = Array.isArray(data[name]) ? data[name] : [];
    let cur: unknown[] = [], size = 0, seq = 0;
    for (const d of docs) {
      const n = enc.encode(JSON.stringify(d)).length;
      if (cur.length && size + n > CHUNK_BYTES) { chunks.push({ collection: name, seq: seq++, docs: cur }); cur = []; size = 0; }
      cur.push(d); size += n;
    }
    if (cur.length) chunks.push({ collection: name, seq: seq++, docs: cur });
  }

  for (let i = 0; i < chunks.length; i++) {
    onProgress(`Upload ho raha hai… ${i + 1}/${chunks.length}`);
    await getJson("/api/backup/restore", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chunk", restoreId, ...chunks[i] }),
    });
  }

  onProgress("Data swap ho raha hai…");
  const { counts } = await getJson("/api/backup/restore", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "commit", restoreId }),
  });
  return counts as Record<string, number>;
}
