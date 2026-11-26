export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel } from "@/lib/db";
import { pickTradeFields, isDateKey } from "@/lib/tradeFields";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const trades = Array.isArray(body?.trades) ? body.trades : [];
    if (!trades.length) {
      return NextResponse.json({ success: false, error: "Koi trade nahi mila import karne ke liye" }, { status: 400 });
    }
    const clean = trades.map(pickTradeFields).filter((t: Record<string, unknown>) => isDateKey(t.date));
    if (!clean.length) {
      return NextResponse.json({ success: false, error: "Kisi bhi row ki date YYYY-MM-DD format mein nahi hai" }, { status: 400 });
    }
    const result = await TradeModel.insertMany(clean, { ordered: false });
    return NextResponse.json({ success: true, count: result.length }, { status: 201 });
  } catch (e: any) {
    const inserted = e?.insertedDocs?.length || e?.result?.insertedCount || 0;
    console.error("POST /api/trades/bulk:", e);
    if (inserted > 0) {
      return NextResponse.json({ success: true, count: inserted, error: "Kuch rows import nahi ho payi (invalid data)" });
    }
    return NextResponse.json({ success: false, error: "Bulk import failed" }, { status: 500 });
  }
}
