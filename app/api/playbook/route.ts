export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, SetupModel, TradeModel } from "@/lib/db";
import { setupStats, PlaybookSetup } from "@/lib/playbook";
import { cleanSetup } from "@/lib/playbookServer";
import type { Trade } from "@/lib/types";

// GET  ?propFirm= → setups (no image data) with stats from the trades tagged with them
// POST           → create a setup
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const propFirm = req.nextUrl.searchParams.get("propFirm");
    const setups = await SetupModel.aggregate([
      { $sort: { name: 1 } },
      { $addFields: { imageCount: { $size: { $ifNull: ["$images", []] } } } },
      { $project: { images: 0 } },
    ]);
    const names = setups.map(s => s.name);
    const tradeQuery: Record<string, unknown> = { strategy: { $in: names } };
    if (propFirm) tradeQuery.propFirm = propFirm;
    const trades = await TradeModel.find(tradeQuery)
      .select("strategy pnl riskAmount entry sl lot pair setupChecks").lean<Trade[]>();
    const data: PlaybookSetup[] = setups.map(s => ({
      _id: String(s._id), name: s.name, description: s.description || "", checklist: s.checklist || [],
      imageCount: s.imageCount, updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : "",
      stats: setupStats(trades.filter(t => t.strategy === s.name)),
    }));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("GET /api/playbook:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const c = cleanSetup(await req.json(), false);
    if (!c.ok) return NextResponse.json({ success: false, error: c.error }, { status: 400 });
    if (await SetupModel.exists({ name: c.set.name })) {
      return NextResponse.json({ success: false, error: "Is naam ka setup pehle se hai" }, { status: 409 });
    }
    const st = await SetupModel.create(c.set);
    return NextResponse.json({ success: true, data: { _id: String(st._id), name: st.name } }, { status: 201 });
  } catch (e) {
    console.error("POST /api/playbook:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
