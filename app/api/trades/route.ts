export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";
import { pickTradeFields, isDateKey } from "@/lib/tradeFields";
import { prepareTradeScreenshot, deleteBlobs } from "@/lib/blobFiles";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const pair = searchParams.get("pair");
    const result = searchParams.get("result");
    const propFirm = searchParams.get("propFirm");
    const search = searchParams.get("search");
    const hasScreenshot = searchParams.get("hasScreenshot");
    const query: Record<string, unknown> = {};
    const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (isDate(dateFrom) || isDate(dateTo)) {
      const range: Record<string, string> = {};
      if (isDate(dateFrom)) range.$gte = dateFrom;
      if (isDate(dateTo)) range.$lte = dateTo;
      query.date = range;
    } else if (month && /^\d{4}-\d{2}$/.test(month)) {
      query.date = { $gte: `${month}-01`, $lte: `${month}-31` };
    }
    if (pair) query.pair = pair;
    if (result === "profit") query.pnl = { $gt: 0 };
    if (result === "loss") query.pnl = { $lt: 0 };
    if (propFirm) query.propFirm = propFirm;
    if (hasScreenshot === "true") {
      // Stored either in Blob (screenshotPath) or, for older/local trades, inline (screenshot).
      query.$and = [{ $or: [{ screenshotPath: { $nin: ["", null] } }, { screenshot: { $nin: ["", null] } }] }];
    }
    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ pair: re }, { strategy: re }, { session: re }, { reasoning: re }, { lesson: re }, { rulesFollowed: re }, { tags: re }];
    }

    const limitParam = parseInt(searchParams.get("limit") || "", 10);
    const skipParam = parseInt(searchParams.get("skip") || "0", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : undefined;
    const skip = Number.isFinite(skipParam) && skipParam > 0 ? skipParam : 0;

    const total = await TradeModel.countDocuments(query);
    // Screenshots are base64 blobs (~100-200KB each) and Vercel caps a response at 4.5MB,
    // so lists never include them: they carry a hasScreenshot flag instead and the image
    // is loaded from /api/trades/[id]/screenshot.
    const pipeline: Record<string, unknown>[] = [
      { $match: query },
      { $sort: { date: -1, time: -1 } },
      { $skip: skip },
    ];
    if (limit) pipeline.push({ $limit: limit });
    pipeline.push(
      { $addFields: { hasScreenshot: { $or: [
        { $gt: [{ $strLenBytes: { $ifNull: ["$screenshot", ""] } }, 0] },
        { $gt: [{ $strLenBytes: { $ifNull: ["$screenshotPath", ""] } }, 0] },
      ] } } },
      { $project: { screenshot: 0, screenshotPath: 0 } },
    );
    if (hasScreenshot === "true") {
      pipeline.push({ $project: { pair: 1, date: 1, time: 1, pnl: 1, propFirm: 1, type: 1, hasScreenshot: 1, updatedAt: 1 } });
    }
    const trades = await TradeModel.aggregate(pipeline as any[]);
    return NextResponse.json({ success: true, data: trades, total });
  } catch (e) {
    console.error("GET /api/trades:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = pickTradeFields(await req.json());
    if (!isDateKey(body.date)) {
      return NextResponse.json({ success: false, error: "Date YYYY-MM-DD format mein honi chahiye" }, { status: 400 });
    }
    await prepareTradeScreenshot(body);
    let trade;
    try {
      trade = await TradeModel.create(body);
    } catch (e) {
      await deleteBlobs([body.screenshotPath as string]); // don't leave an orphan upload behind
      throw e;
    }
    return NextResponse.json({ success: true, data: trade }, { status: 201 });
  } catch (e) {
    console.error("POST /api/trades:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
