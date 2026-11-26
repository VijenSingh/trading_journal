import { put, list, del, issueSignedToken, presignUrl } from "@vercel/blob";
import {
  connectDB, TradeModel, PropFirmModel, DailyMistakeModel,
  GoalModel, TransactionModel, AccountTxnModel, RuleModel, PairModel, CertificateModel, AccountModel, SetupModel,
} from "@/lib/db";
import { getTodayIST } from "@/lib/utils";
import { blobPath, blobToDataUrl, uploadDataUrl, deleteBlobs } from "@/lib/blobFiles";

// Cloud backups: the same full version-1 JSON the Backup button downloads, stored
// privately in Vercel Blob. Built server-side (no 4.5MB limit applies between the
// function and Blob) by the weekly cron and by "Abhi backup lo".

const PREFIX = blobPath("backups/");
const KEEP = 8;

export function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function buildFullBackup() {
  await connectDB();
  const [trades, propFirms, dailyMistakes, goals, transactions, accountTxns, rules, pairs, certificates, accounts, setups] = await Promise.all([
    TradeModel.find({}).lean(),
    PropFirmModel.find({}).lean(),
    DailyMistakeModel.find({}).lean(),
    GoalModel.find({}).lean(),
    TransactionModel.find({}).lean(),
    AccountTxnModel.find({}).lean(),
    RuleModel.find({}).lean(),
    PairModel.find({}).lean(),
    CertificateModel.find({}).lean(),
    AccountModel.find({}).lean(),
    SetupModel.find({}).lean(),
  ]);

  // Files kept in Blob are inlined back as data URLs, so a backup file never depends on
  // the Blob store still existing. Path fields are dropped: a restore re-uploads.
  const jobs: (() => Promise<void>)[] = [];
  for (const t of trades as any[]) {
    if (t.screenshotPath) jobs.push(async () => { t.screenshot = await blobToDataUrl(t.screenshotPath); });
  }
  for (const c of certificates as any[]) {
    if (c.filePath) jobs.push(async () => { c.fileData = await blobToDataUrl(c.filePath, c.mimeType); });
  }
  for (let i = 0; i < jobs.length; i += 8) await Promise.all(jobs.slice(i, i + 8).map(j => j()));
  for (const t of trades as any[]) delete t.screenshotPath;
  for (const c of certificates as any[]) { delete c.filePath; delete c.fileSize; }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { trades, propFirms, dailyMistakes, goals, transactions, accountTxns, rules, pairs, certificates, accounts, setups },
  };
}

export interface CloudBackup { pathname: string; size: number; uploadedAt: string }

export async function listCloudBackups(): Promise<CloudBackup[]> {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  return blobs
    .map(b => ({ pathname: b.pathname, size: b.size, uploadedAt: new Date(b.uploadedAt).toISOString() }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

// Saves a new backup (named by IST date + UTC time) and keeps only the newest KEEP files.
export async function createCloudBackup(): Promise<{ pathname: string; size: number; trades: number; deleted: number }> {
  const backup = await buildFullBackup();
  const body = JSON.stringify(backup);
  const stamp = new Date().toISOString().slice(11, 16).replace(":", "");
  const pathname = `${PREFIX}tradermind-backup-${getTodayIST()}-${stamp}.json`;
  await put(pathname, body, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    multipart: body.length > 20 * 1024 * 1024,
  });

  const all = await listCloudBackups();
  const old = all.slice(KEEP).map(b => b.pathname);
  if (old.length) await del(old);
  return { pathname, size: body.length, trades: backup.data.trades.length, deleted: old.length };
}

// A link valid for 5 minutes that downloads one private backup straight from Blob
// (so the file never passes through a function and its 4.5MB response cap).
export async function cloudBackupDownloadUrl(pathname: string): Promise<string> {
  const validUntil = Date.now() + 5 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, validUntil, access: "private" });
  return presignedUrl;
}

export function isBackupPathname(p: unknown): p is string {
  return typeof p === "string" && p.startsWith(PREFIX) && /^tradermind-backup-[\w-]+\.json$/.test(p.slice(PREFIX.length));
}

// ─── Moving files that still sit in the DB (older data, restores) into Blob ──────
const MIGRATE_BATCH = 15; // keeps one call well inside the function time limit

export async function countInlineFiles(): Promise<{ screenshots: number; certificates: number }> {
  await connectDB();
  const [screenshots, certificates] = await Promise.all([
    TradeModel.countDocuments({ screenshot: { $regex: "^data:" } }),
    CertificateModel.countDocuments({ fileData: { $regex: "^data:" } }),
  ]);
  return { screenshots, certificates };
}

// Moves up to one batch. Each document is switched only if its inline data is still the
// one that was uploaded (a concurrent edit wins; the stray upload is deleted).
export async function migrateInlineFiles(): Promise<{ moved: number; remaining: { screenshots: number; certificates: number } }> {
  await connectDB();
  let moved = 0;
  const trades = await TradeModel.find({ screenshot: { $regex: "^data:" } }).select("screenshot").limit(MIGRATE_BATCH).lean<{ _id: unknown; screenshot: string }[]>();
  for (const t of trades) {
    const { pathname } = await uploadDataUrl("screenshots", t.screenshot);
    const r = await TradeModel.updateOne(
      { _id: t._id, screenshot: t.screenshot },
      { $set: { screenshotPath: pathname, screenshot: "" } },
      { timestamps: false }
    );
    if (r.modifiedCount) moved++; else await deleteBlobs([pathname]);
  }
  const left = MIGRATE_BATCH - trades.length;
  if (left > 0) {
    const certs = await CertificateModel.find({ fileData: { $regex: "^data:" } }).select("fileData").limit(left).lean<{ _id: unknown; fileData: string }[]>();
    for (const c of certs) {
      const { pathname, size } = await uploadDataUrl("certificates", c.fileData);
      const r = await CertificateModel.updateOne(
        { _id: c._id, fileData: c.fileData },
        { $set: { filePath: pathname, fileSize: size, fileData: "" } },
        { timestamps: false }
      );
      if (r.modifiedCount) moved++; else await deleteBlobs([pathname]);
    }
  }
  return { moved, remaining: await countInlineFiles() };
}

// Migration only runs right after a successful cloud backup exists, so the inline
// originals are always recoverable.
export async function hasRecentCloudBackup(hours = 24): Promise<boolean> {
  const latest = (await listCloudBackups())[0];
  return !!latest && Date.now() - new Date(latest.uploadedAt).getTime() < hours * 3600 * 1000;
}
