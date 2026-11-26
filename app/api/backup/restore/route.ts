export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import {
  connectDB, TradeModel, PropFirmModel, DailyMistakeModel,
  GoalModel, TransactionModel, AccountTxnModel, RuleModel, PairModel, CertificateModel,
  RestoreChunkModel, RestoreSessionModel,
} from "@/lib/db";

// Full restore in three steps, so neither the 4.5MB request cap nor a failure halfway
// can lose data:
//   begin  → { restoreId }                      (expected per-collection counts recorded)
//   chunk  → stage a slice of one collection    (repeat; nothing live is touched yet)
//   commit → one transaction: wipe + insert     (any error rolls back; old data stays)
const MODELS: Record<string, mongoose.Model<any>> = {
  trades: TradeModel, propFirms: PropFirmModel, dailyMistakes: DailyMistakeModel,
  goals: GoalModel, transactions: TransactionModel, accountTxns: AccountTxnModel,
  rules: RuleModel, pairs: PairModel, certificates: CertificateModel,
};

const strip = (docs: unknown[]): Record<string, unknown>[] =>
  docs.map((d: any) => {
    const { _id, __v, _hasScreenshot, fileSize, ...rest } = d || {};
    return rest;
  });

function bad(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (body?.action === "begin") {
      const expected = body.expected;
      if (!expected || typeof expected !== "object" || !Number.isInteger(expected.trades)) {
        return bad("Invalid ya purani backup file");
      }
      const clean: Record<string, number> = {};
      for (const name of Object.keys(MODELS)) {
        const n = expected[name] ?? 0;
        if (!Number.isInteger(n) || n < 0) return bad(`Invalid count for ${name}`);
        clean[name] = n;
      }
      const restoreId = randomUUID();
      await RestoreSessionModel.create({ restoreId, expected: clean });
      return NextResponse.json({ success: true, restoreId });
    }

    if (body?.action === "chunk") {
      const { restoreId, collection, seq, docs } = body;
      if (typeof restoreId !== "string" || !(await RestoreSessionModel.exists({ restoreId }))) return bad("Restore session nahi mila");
      if (!MODELS[collection]) return bad("Unknown collection");
      if (!Number.isInteger(seq) || !Array.isArray(docs)) return bad("Invalid chunk");
      await RestoreChunkModel.updateOne(
        { restoreId, collectionName: collection, seq },
        { $set: { docs } },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

    if (body?.action === "commit") {
      const { restoreId } = body;
      const restore = typeof restoreId === "string" ? await RestoreSessionModel.findOne({ restoreId }).lean<{ expected: Record<string, number> }>() : null;
      if (!restore) return bad("Restore session nahi mila");

      const chunks = await RestoreChunkModel.find({ restoreId }).sort({ collectionName: 1, seq: 1 }).lean<{ collectionName: string; docs: unknown[] }[]>();
      const staged: Record<string, unknown[]> = {};
      for (const name of Object.keys(MODELS)) staged[name] = [];
      for (const c of chunks) staged[c.collectionName]?.push(...c.docs);

      // Every chunk must have arrived — otherwise refuse before touching live data.
      for (const name of Object.keys(MODELS)) {
        if (staged[name].length !== restore.expected[name]) {
          return bad(`Upload adhoora raha (${name}: ${staged[name].length}/${restore.expected[name]}) — kuch change nahi hua, phir se try karo`);
        }
      }

      const counts: Record<string, number> = {};
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const [name, model] of Object.entries(MODELS)) {
            await model.deleteMany({}, { session });
            const docs = strip(staged[name]);
            counts[name] = docs.length ? (await model.insertMany(docs, { session, ordered: true })).length : 0;
          }
        });
      } catch (e) {
        console.error("POST /api/backup/restore commit (rolled back):", e);
        return bad("Restore fail hua — purana data jaisa tha waisa hai. " + (e instanceof Error ? e.message.slice(0, 200) : ""), 500);
      } finally {
        await session.endSession();
        await RestoreChunkModel.deleteMany({ restoreId }).catch(() => {});
        await RestoreSessionModel.deleteOne({ restoreId }).catch(() => {});
      }
      return NextResponse.json({ success: true, counts });
    }

    return bad("Unknown action");
  } catch (e) {
    console.error("POST /api/backup/restore:", e);
    return bad("Restore failed", 500);
  }
}
