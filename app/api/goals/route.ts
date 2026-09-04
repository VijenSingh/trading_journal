export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, GoalModel } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const periodType = searchParams.get("periodType");
    const periodKey = searchParams.get("periodKey");
    const propFirm = searchParams.get("propFirm") || "";
    if (!periodType || !periodKey) {
      return NextResponse.json({ success: false, error: "periodType and periodKey required" }, { status: 400 });
    }
    const doc = await GoalModel.findOne({ periodType, periodKey, propFirm }).lean();
    return NextResponse.json({ success: true, data: doc || { periodType, periodKey, propFirm, targetPnl: 0, maxLossLimit: 0 } });
  } catch (e) {
    console.error("GET /api/goals:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { periodType, periodKey, propFirm, targetPnl, maxLossLimit } = await req.json();
    if (!periodType || !periodKey) {
      return NextResponse.json({ success: false, error: "periodType and periodKey required" }, { status: 400 });
    }
    const doc = await GoalModel.findOneAndUpdate(
      { periodType, periodKey, propFirm: propFirm || "" },
      { $set: { targetPnl: targetPnl || 0, maxLossLimit: maxLossLimit || 0 } },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, data: doc });
  } catch (e) {
    console.error("POST /api/goals:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
