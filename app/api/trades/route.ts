import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const pair = searchParams.get("pair");
    const result = searchParams.get("result");
    const query: Record<string, unknown> = {};
    if (month) query.date = { $regex: `^${month}` };
    if (pair) query.pair = pair;
    if (result === "profit") query.pnl = { $gt: 0 };
    if (result === "loss") query.pnl = { $lt: 0 };
    const trades = await TradeModel.find(query).sort({ date: -1, time: -1 }).lean();
    return NextResponse.json({ success: true, data: trades });
  } catch (e) {
    console.error("GET /api/trades:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const trade = await TradeModel.create(body);
    return NextResponse.json({ success: true, data: trade }, { status: 201 });
  } catch (e) {
    console.error("POST /api/trades:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
