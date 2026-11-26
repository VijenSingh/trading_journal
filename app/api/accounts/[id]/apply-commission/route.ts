import { NextRequest, NextResponse } from "next/server";
import { connectDB, AccountModel, TradeModel } from "@/lib/db";

// One-off: put this account's commission on its older trades — those saved before fees
// existed (no grossPnl, no fees). Each gets fees = contracts × rate, grossPnl = its old
// P&L, and pnl = gross − fees. Trades that already have fees are never touched, so
// running it twice changes nothing.
export async function POST(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    const acc = await AccountModel.findById(params.id).select("commissionPerContract").lean<{ commissionPerContract?: number }>();
    if (!acc) return NextResponse.json({ success: false, error: "Account nahi mila" }, { status: 404 });
    const rate = Number(acc.commissionPerContract) || 0;
    if (!(rate > 0)) return NextResponse.json({ success: false, error: "Pehle account par commission set karo" }, { status: 400 });

    const r = await TradeModel.updateMany(
      { accounts: params.id, grossPnl: null, $or: [{ fees: 0 }, { fees: { $exists: false } }] },
      [
        { $set: { fees: { $round: [{ $multiply: [{ $ifNull: ["$lot", 0] }, rate] }, 2] }, grossPnl: "$pnl" } },
        { $set: { pnl: { $round: [{ $subtract: ["$grossPnl", "$fees"] }, 2] } } },
      ],
      { timestamps: false }
    );
    return NextResponse.json({ success: true, updated: r.modifiedCount });
  } catch (e) {
    console.error("POST /api/accounts/[id]/apply-commission:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
