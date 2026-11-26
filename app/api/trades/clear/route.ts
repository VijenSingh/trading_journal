import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";
import { deleteBlobs } from "@/lib/blobFiles";

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const propFirm = searchParams.get("propFirm");
    const query: Record<string, unknown> = {};
    if (propFirm) query.propFirm = propFirm;
    // Screenshots of the trades being cleared go too.
    const shots = await TradeModel.find({ ...query, screenshotPath: { $nin: ["", null] } }).select("screenshotPath").lean<{ screenshotPath: string }[]>();
    const result = await TradeModel.deleteMany(query);
    await deleteBlobs(shots.map(s => s.screenshotPath));
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    console.error("DELETE /api/trades/clear:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
