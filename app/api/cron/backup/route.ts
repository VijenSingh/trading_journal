export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { blobConfigured, createCloudBackup } from "@/lib/backupServer";

// Weekly Vercel Cron (see vercel.json). Public in middleware, so it is guarded here:
// Vercel sends "Authorization: Bearer <CRON_SECRET>". Without CRON_SECRET set this
// refuses to run, so nobody else can trigger backups.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ success: false, error: "CRON_SECRET set nahi hai" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!blobConfigured()) {
    return NextResponse.json({ success: false, error: "Blob store connect nahi hai (BLOB_READ_WRITE_TOKEN missing)" }, { status: 503 });
  }
  try {
    const result = await createCloudBackup();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("GET /api/cron/backup:", e);
    return NextResponse.json({ success: false, error: "Backup failed" }, { status: 500 });
  }
}
