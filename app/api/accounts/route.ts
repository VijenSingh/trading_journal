export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, AccountModel, AccountTxnModel, TradeModel, ACCOUNT_STATUSES } from "@/lib/db";
import { computeAccountStats } from "@/lib/accountStats";
import { isDateKey } from "@/lib/tradeFields";
import type { PropAccount } from "@/lib/types";
import { sanitizeRules } from "@/lib/accountRules";
import { getTodayIST } from "@/lib/utils";

// GET  ?propFirm=  → accounts with balance / drawdown / fees / payouts
// POST             → create an account (+ its challenge fee as an investment entry)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const propFirm = req.nextUrl.searchParams.get("propFirm");
    const filter = propFirm ? { propFirm } : {};
    const accounts = await AccountModel.find(filter).sort({ propFirm: 1, startDate: -1 }).lean<PropAccount[]>();
    const ids = accounts.map(a => String(a._id));
    const [trades, txns] = await Promise.all([
      TradeModel.find({ accounts: { $in: ids } }).select("date time pnl accounts").lean(),
      AccountTxnModel.find({ accountId: { $in: ids } }).select("accountId type amount date").lean(),
    ]);
    return NextResponse.json({ success: true, data: computeAccountStats(accounts, trades as any[], txns as any[], getTodayIST()) });
  } catch (e) {
    console.error("GET /api/accounts:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const b = await req.json();
    const propFirm = String(b.propFirm || "").trim();
    const name = String(b.name || "").trim();
    const size = Number(b.size);
    const status = ACCOUNT_STATUSES.includes(b.status) ? b.status : "evaluation";
    const fee = Number(b.fee) || 0;
    if (!propFirm || !name) return NextResponse.json({ success: false, error: "Firm aur account name zaroori hai" }, { status: 400 });
    if (!(size > 0)) return NextResponse.json({ success: false, error: "Account size enter karo" }, { status: 400 });
    if (!isDateKey(b.startDate)) return NextResponse.json({ success: false, error: "Start date galat hai" }, { status: 400 });
    if (fee < 0) return NextResponse.json({ success: false, error: "Fee negative nahi ho sakti" }, { status: 400 });

    let rules = undefined;
    if (b.rules !== undefined) {
      const clean = sanitizeRules(b.rules);
      if (!clean) return NextResponse.json({ success: false, error: "Rules ki values check karo" }, { status: 400 });
      rules = clean;
    }
    const account = await AccountModel.create({
      propFirm, name, size, startDate: b.startDate, status, rules,
      statusHistory: [{ status, date: b.startDate }],
      notes: String(b.notes || ""),
    });
    if (fee > 0) {
      await AccountTxnModel.create({
        propFirm, accountId: String(account._id), type: "investment", amount: fee, date: b.startDate, note: `${name} fee`,
      });
    }
    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (e) {
    console.error("POST /api/accounts:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
