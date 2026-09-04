export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const propFirm = searchParams.get("propFirm");
    const query: Record<string, unknown> = {};
    if (propFirm) query.propFirm = propFirm;

    const trades = await TradeModel.find(query)
      .select("-screenshot -reasoning -lesson -rulesFollowed")
      .sort({ date: 1 })
      .lean();
    return NextResponse.json({ success: true, data: trades });
  } catch (e) {
    console.error("GET /api/analytics:", e);
    return NextResponse.json({ success: false, data: [], error: "DB error" });
  }
}
