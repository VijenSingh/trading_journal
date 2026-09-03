export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, TransactionModel } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();
    const txns = await TransactionModel.find({}).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: txns });
  } catch (e) {
    console.error("GET /api/balance:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    if (!body.date || !["deposit", "withdrawal"].includes(body.type) || !body.amount || body.amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid transaction" }, { status: 400 });
    }
    const txn = await TransactionModel.create({
      date: body.date, type: body.type, amount: Math.abs(body.amount), note: body.note || "",
    });
    return NextResponse.json({ success: true, data: txn }, { status: 201 });
  } catch (e) {
    console.error("POST /api/balance:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
