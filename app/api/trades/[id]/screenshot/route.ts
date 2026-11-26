import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";
import { dataUrlResponse } from "@/lib/dataUrl";

// Serves one trade's screenshot as raw bytes, so trade lists never carry base64 images
// (Vercel caps a response at 4.5MB). Callers add ?v=<updatedAt> to the URL, so an edited
// screenshot gets a new URL and the old one can be cached for good.
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const trade = await TradeModel.findById(params.id).select("screenshot").lean<{ screenshot?: string }>();
    if (!trade?.screenshot) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return dataUrlResponse(trade.screenshot, { cacheControl: "private, max-age=31536000, immutable" });
  } catch (e) {
    console.error("GET /api/trades/[id]/screenshot:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
