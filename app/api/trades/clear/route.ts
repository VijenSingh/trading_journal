import { NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";

export async function DELETE() {
  try {
    await connectDB();
    const result = await TradeModel.deleteMany({});
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
