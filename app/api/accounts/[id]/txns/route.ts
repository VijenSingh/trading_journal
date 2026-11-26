import { NextRequest, NextResponse } from "next/server";
import { connectDB, AccountModel, AccountTxnModel } from "@/lib/db";
import { isDateKey } from "@/lib/tradeFields";

// GET  → this account's fee + payout entries
// POST → add a payout (or an extra fee, e.g. a reset) to this account. They also count
//        in the firm-level investment/payout totals, since they are AccountTxn entries.
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const txns = await AccountTxnModel.find({ accountId: params.id }).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: txns });
  } catch (e) {
    console.error("GET /api/accounts/[id]/txns:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const account = await AccountModel.findById(params.id).select("propFirm name").lean<{ propFirm: string; name: string }>();
    if (!account) return NextResponse.json({ success: false, error: "Account nahi mila" }, { status: 404 });
    const b = await req.json();
    const amount = Number(b.amount);
    if (!["investment", "payout"].includes(b.type) || !(amount > 0) || !isDateKey(b.date)) {
      return NextResponse.json({ success: false, error: "Type, amount aur date check karo" }, { status: 400 });
    }
    const txn = await AccountTxnModel.create({
      propFirm: account.propFirm, accountId: params.id, type: b.type, amount, date: b.date,
      note: String(b.note || "") || `${account.name} ${b.type === "payout" ? "payout" : "fee"}`,
    });
    return NextResponse.json({ success: true, data: txn }, { status: 201 });
  } catch (e) {
    console.error("POST /api/accounts/[id]/txns:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
