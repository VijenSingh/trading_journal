import { NextRequest, NextResponse } from "next/server";
import { connectDB, DailyMistakeModel } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const date = new URL(req.url).searchParams.get("date") || new Date().toISOString().split("T")[0];
    const doc = await DailyMistakeModel.findOne({ date }).lean();
    return NextResponse.json({ success: true, data: doc || { date, avoided: [] } });
  } catch (e) {
    console.error("GET /api/mistakes:", e);
    return NextResponse.json({ success: true, data: { avoided: [] } });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { date, avoided } = await req.json();
    const doc = await DailyMistakeModel.findOneAndUpdate(
      { date },
      { $set: { avoided } },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, data: doc });
  } catch (e) {
    console.error("POST /api/mistakes:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
