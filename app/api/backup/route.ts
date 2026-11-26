export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  connectDB, TradeModel, PropFirmModel, DailyMistakeModel,
  GoalModel, TransactionModel, AccountTxnModel, RuleModel, PairModel, CertificateModel,
} from "@/lib/db";

// Backup, step 1: every collection, but without the big base64 blobs (trade screenshots,
// certificate files) — all of them together easily pass Vercel's 4.5MB response cap.
// Trades that have a screenshot are flagged; the browser then fetches each blob from
// /api/backup/item and assembles the same full version-1 file as before.
// Restore lives at /api/backup/restore.
export async function GET() {
  try {
    await connectDB();
    const [trades, propFirms, dailyMistakes, goals, transactions, accountTxns, rules, pairs, certificates] = await Promise.all([
      TradeModel.aggregate([
        { $addFields: { _hasScreenshot: { $or: [
          { $gt: [{ $strLenBytes: { $ifNull: ["$screenshot", ""] } }, 0] },
          { $gt: [{ $strLenBytes: { $ifNull: ["$screenshotPath", ""] } }, 0] },
        ] } } },
        { $project: { screenshot: 0, screenshotPath: 0 } },
      ]),
      PropFirmModel.find({}).lean(),
      DailyMistakeModel.find({}).lean(),
      GoalModel.find({}).lean(),
      TransactionModel.find({}).lean(),
      AccountTxnModel.find({}).lean(),
      RuleModel.find({}).lean(),
      PairModel.find({}).lean(),
      CertificateModel.find({}).select("-fileData -filePath -fileSize").lean(),
    ]);
    return NextResponse.json({
      success: true,
      version: 1,
      partial: true, // blobs still to be fetched from /api/backup/item
      exportedAt: new Date().toISOString(),
      data: { trades, propFirms, dailyMistakes, goals, transactions, accountTxns, rules, pairs, certificates },
    });
  } catch (e) {
    console.error("GET /api/backup:", e);
    return NextResponse.json({ success: false, error: "Backup failed" }, { status: 500 });
  }
}
