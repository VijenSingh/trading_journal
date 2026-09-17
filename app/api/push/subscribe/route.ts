export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, PushSubscriptionModel } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys } = body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ success: false, error: "Invalid subscription" }, { status: 400 });
    }
    await connectDB();
    await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      { upsert: true }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/push/subscribe:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
