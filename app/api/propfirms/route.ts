export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, PropFirmModel } from "@/lib/db";

const DEFAULT_FIRMS = ["Lucid", "Tradify", "FundedNext"];

export async function GET() {
  try {
    await connectDB();
    let firms = await PropFirmModel.find({}).sort({ name: 1 }).lean();
    if (firms.length === 0) {
      await PropFirmModel.insertMany(DEFAULT_FIRMS.map(name => ({ name })));
      firms = await PropFirmModel.find({}).sort({ name: 1 }).lean();
    }
    return NextResponse.json({ success: true, data: firms.map(f => f.name) });
  } catch (e) {
    console.error("GET /api/propfirms:", e);
    return NextResponse.json({ success: false, data: [], error: "DB error" });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name } = await req.json();
    const trimmed = String(name || "").trim();
    if (!trimmed) return NextResponse.json({ success: false, error: "Name required" }, { status: 400 });
    const doc = await PropFirmModel.findOneAndUpdate(
      { name: trimmed },
      { $setOnInsert: { name: trimmed } },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (e) {
    console.error("POST /api/propfirms:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
