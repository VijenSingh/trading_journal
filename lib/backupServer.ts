import { put, list, del, issueSignedToken, presignUrl } from "@vercel/blob";
import {
  connectDB, TradeModel, PropFirmModel, DailyMistakeModel,
  GoalModel, TransactionModel, AccountTxnModel, RuleModel, PairModel, CertificateModel,
} from "@/lib/db";
import { getTodayIST } from "@/lib/utils";

// Cloud backups: the same full version-1 JSON the Backup button downloads, stored
// privately in Vercel Blob. Built server-side (no 4.5MB limit applies between the
// function and Blob) by the weekly cron and by "Abhi backup lo".

const PREFIX = "backups/";
const KEEP = 8;

export function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function buildFullBackup() {
  await connectDB();
  const [trades, propFirms, dailyMistakes, goals, transactions, accountTxns, rules, pairs, certificates] = await Promise.all([
    TradeModel.find({}).lean(),
    PropFirmModel.find({}).lean(),
    DailyMistakeModel.find({}).lean(),
    GoalModel.find({}).lean(),
    TransactionModel.find({}).lean(),
    AccountTxnModel.find({}).lean(),
    RuleModel.find({}).lean(),
    PairModel.find({}).lean(),
    CertificateModel.find({}).lean(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { trades, propFirms, dailyMistakes, goals, transactions, accountTxns, rules, pairs, certificates },
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
  return typeof p === "string" && /^backups\/tradermind-backup-[\w-]+\.json$/.test(p);
}
