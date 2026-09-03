import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const trade = await TradeModel.findById(params.id).lean();
    if (!trade) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: trade });
  } catch (e) {
    console.error("GET /api/trades/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await TradeModel.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/trades/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const updated = await TradeModel.findByIdAndUpdate(params.id, body, { new: true });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("PATCH /api/trades/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
