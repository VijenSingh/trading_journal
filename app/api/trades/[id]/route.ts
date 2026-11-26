import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";
import { pickTradeFields, isDateKey } from "@/lib/tradeFields";
import { prepareTradeScreenshot, deleteBlobs } from "@/lib/blobFiles";
import { screenshotUrl } from "@/lib/types";

type TradeDoc = { _id: unknown; screenshot?: string; screenshotPath?: string; updatedAt?: Date };

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    const trade = await TradeModel.findById(params.id).lean<TradeDoc>();
    if (!trade) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    // A Blob-stored screenshot is handed to the edit form as its URL; sending that URL
    // back on save means "unchanged" (see prepareTradeScreenshot).
    const { screenshotPath, ...rest } = trade;
    if (screenshotPath) {
      rest.screenshot = screenshotUrl({ _id: String(trade._id), updatedAt: trade.updatedAt ? new Date(trade.updatedAt).toISOString() : "" });
    }
    return NextResponse.json({ success: true, data: rest });
  } catch (e) {
    console.error("GET /api/trades/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    const removed = await TradeModel.findByIdAndDelete(params.id).lean<TradeDoc>();
    await deleteBlobs([removed?.screenshotPath]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/trades/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  let uploaded: string | undefined;
  try {
    await connectDB();
    const body = pickTradeFields(await req.json());
    if ("date" in body && !isDateKey(body.date)) {
      return NextResponse.json({ success: false, error: "Date YYYY-MM-DD format mein honi chahiye" }, { status: 400 });
    }
    const before = await TradeModel.findById(params.id).select("screenshotPath").lean<TradeDoc>();
    if (!before) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const screenshotChanged = await prepareTradeScreenshot(body);
    if (body.screenshotPath) uploaded = body.screenshotPath as string;

    const updated = await TradeModel.findByIdAndUpdate(params.id, { $set: body }, { new: true, runValidators: true });
    if (!updated) {
      await deleteBlobs([uploaded]);
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    // The screenshot was replaced or removed: the old file is no longer referenced.
    if (screenshotChanged && before.screenshotPath && before.screenshotPath !== body.screenshotPath) {
      await deleteBlobs([before.screenshotPath]);
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    await deleteBlobs([uploaded]);
    console.error("PATCH /api/trades/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
