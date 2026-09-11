export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, PairModel } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();
    const pairs = await PairModel.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: pairs.map(p => p.name) });
  } catch (e) {
    console.error("GET /api/pairs:", e);
    return NextResponse.json({ success: false, data: [], error: "DB error" });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name } = await req.json();
    const trimmed = String(name || "").trim();
    if (!trimmed) return NextResponse.json({ success: false, error: "Name required" }, { status: 400 });
    const doc = await PairModel.findOneAndUpdate(
      { name: trimmed },
      { $setOnInsert: { name: trimmed } },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (e) {
    console.error("POST /api/pairs:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
