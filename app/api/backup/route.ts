export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  connectDB, TradeModel, PropFirmModel, DailyMistakeModel,
  GoalModel, TransactionModel, AccountTxnModel, RuleModel,
} from "@/lib/db";

export async function GET() {
  try {
    await connectDB();
    const [trades, propFirms, dailyMistakes, goals, transactions, accountTxns, rules] = await Promise.all([
      TradeModel.find({}).lean(),
      PropFirmModel.find({}).lean(),
      DailyMistakeModel.find({}).lean(),
      GoalModel.find({}).lean(),
      TransactionModel.find({}).lean(),
      AccountTxnModel.find({}).lean(),
      RuleModel.find({}).lean(),
    ]);
    return NextResponse.json({
      success: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { trades, propFirms, dailyMistakes, goals, transactions, accountTxns, rules },
    });
  } catch (e) {
    console.error("GET /api/backup:", e);
    return NextResponse.json({ success: false, error: "Backup failed" }, { status: 500 });
  }
}

// Full restore: replaces every collection with the contents of the uploaded backup.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const data = body?.data;
    if (body?.version !== 1 || !data || !Array.isArray(data.trades)) {
      return NextResponse.json({ success: false, error: "Invalid ya purani backup file" }, { status: 400 });
    }

    const strip = (docs: unknown): Record<string, unknown>[] =>
      Array.isArray(docs) ? docs.map(({ _id, __v, ...rest }: any) => rest) : [];

    await Promise.all([
      TradeModel.deleteMany({}),
      PropFirmModel.deleteMany({}),
      DailyMistakeModel.deleteMany({}),
      GoalModel.deleteMany({}),
      TransactionModel.deleteMany({}),
      AccountTxnModel.deleteMany({}),
      RuleModel.deleteMany({}),
    ]);

    const counts = { trades: 0, propFirms: 0, dailyMistakes: 0, goals: 0, transactions: 0, accountTxns: 0, rules: 0 };
    if (data.trades?.length) counts.trades = (await TradeModel.insertMany(strip(data.trades), { ordered: false })).length;
    if (data.propFirms?.length) counts.propFirms = (await PropFirmModel.insertMany(strip(data.propFirms), { ordered: false })).length;
    if (data.dailyMistakes?.length) counts.dailyMistakes = (await DailyMistakeModel.insertMany(strip(data.dailyMistakes), { ordered: false })).length;
    if (data.goals?.length) counts.goals = (await GoalModel.insertMany(strip(data.goals), { ordered: false })).length;
    if (data.transactions?.length) counts.transactions = (await TransactionModel.insertMany(strip(data.transactions), { ordered: false })).length;
    if (data.accountTxns?.length) counts.accountTxns = (await AccountTxnModel.insertMany(strip(data.accountTxns), { ordered: false })).length;
    if (data.rules?.length) counts.rules = (await RuleModel.insertMany(strip(data.rules), { ordered: false })).length;

    return NextResponse.json({ success: true, counts });
  } catch (e) {
    console.error("POST /api/backup:", e);
    return NextResponse.json({ success: false, error: "Restore failed" }, { status: 500 });
  }
}
