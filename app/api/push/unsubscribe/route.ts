export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, PushSubscriptionModel } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ success: false, error: "endpoint required" }, { status: 400 });
    await connectDB();
    await PushSubscriptionModel.deleteOne({ endpoint });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/push/unsubscribe:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
