export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel, PushSubscriptionModel } from "@/lib/db";
import { getWebPush } from "@/lib/webpush";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await connectDB();
    const webpush = getWebPush();
    if (!webpush) return NextResponse.json({ success: false, error: "Push not configured" }, { status: 500 });

    const todayCount = await TradeModel.countDocuments({ date: getToday() });
    if (todayCount > 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "Trade already logged today" });
    }

    const subs = await PushSubscriptionModel.find({}).lean();
    const payload = JSON.stringify({
      title: "📝 Aaj ka trade journal?",
      body: "Abhi tak koi trade log nahi hua — agar trade liya hai, journal karna mat bhoolo.",
    });

    let sent = 0;
    await Promise.all(
      subs.map(async s => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys },
            payload
          );
          sent++;
        } catch (e: any) {
          // Subscription is dead (expired/revoked) — remove it.
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await PushSubscriptionModel.deleteOne({ endpoint: s.endpoint });
          }
        }
      })
    );

    return NextResponse.json({ success: true, sent, totalSubs: subs.length });
  } catch (e) {
    console.error("GET /api/cron/reminder:", e);
    return NextResponse.json({ success: false, error: "Cron failed" }, { status: 500 });
  }
}
