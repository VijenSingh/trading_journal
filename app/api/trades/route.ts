export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const pair = searchParams.get("pair");
    const result = searchParams.get("result");
    const propFirm = searchParams.get("propFirm");
    const search = searchParams.get("search");
    const query: Record<string, unknown> = {};
    if (month && /^\d{4}-\d{2}$/.test(month)) query.date = { $gte: `${month}-01`, $lte: `${month}-31` };
    if (pair) query.pair = pair;
    if (result === "profit") query.pnl = { $gt: 0 };
    if (result === "loss") query.pnl = { $lt: 0 };
    if (propFirm) query.propFirm = propFirm;
    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ pair: re }, { strategy: re }, { session: re }, { reasoning: re }, { lesson: re }, { rulesFollowed: re }, { tags: re }];
    }

    const limitParam = parseInt(searchParams.get("limit") || "", 10);
    const skipParam = parseInt(searchParams.get("skip") || "0", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : undefined;
    const skip = Number.isFinite(skipParam) && skipParam > 0 ? skipParam : 0;

    const total = await TradeModel.countDocuments(query);
    let q = TradeModel.find(query).sort({ date: -1, time: -1 }).skip(skip);
    if (limit) q = q.limit(limit);
    const trades = await q.lean();
    return NextResponse.json({ success: true, data: trades, total });
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
