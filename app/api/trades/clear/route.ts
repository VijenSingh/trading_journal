import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const propFirm = searchParams.get("propFirm");
    const query: Record<string, unknown> = {};
    if (propFirm) query.propFirm = propFirm;
    const result = await TradeModel.deleteMany(query);
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
