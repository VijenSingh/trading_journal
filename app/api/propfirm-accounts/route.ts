export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, AccountTxnModel } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const propFirm = searchParams.get("propFirm");
    const query: Record<string, unknown> = {};
    if (propFirm) query.propFirm = propFirm;
    const txns = await AccountTxnModel.find(query).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: txns });
  } catch (e) {
    console.error("GET /api/propfirm-accounts:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    if (!body.propFirm || !["investment", "payout"].includes(body.type) || !body.amount || body.amount <= 0 || !body.date) {
      return NextResponse.json({ success: false, error: "Invalid entry" }, { status: 400 });
    }
    const txn = await AccountTxnModel.create({
      propFirm: body.propFirm, type: body.type, amount: Math.abs(body.amount),
      date: body.date, note: body.note || "",
    });
    return NextResponse.json({ success: true, data: txn }, { status: 201 });
  } catch (e) {
    console.error("POST /api/propfirm-accounts:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
