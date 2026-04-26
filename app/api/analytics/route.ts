import { NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();
    const trades = await TradeModel.find({}).sort({ date: 1 }).lean();
    return NextResponse.json({ success: true, data: trades });
  } catch (e) {
    console.error("GET /api/analytics:", e);
    return NextResponse.json({ success: false, data: [], error: "DB error" });
  }
}
