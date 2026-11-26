export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { blobConfigured, createCloudBackup, listCloudBackups, cloudBackupDownloadUrl, isBackupPathname } from "@/lib/backupServer";

const notConfigured = () =>
  NextResponse.json({ success: false, configured: false, error: "Vercel Blob store is project se connect nahi hai" }, { status: 503 });

// GET                    → list cloud backups (newest first)
// GET ?download=<path>   → redirect to a 5-minute download link for that backup
export async function GET(req: NextRequest) {
  if (!blobConfigured()) return notConfigured();
  try {
    const download = req.nextUrl.searchParams.get("download");
    if (download !== null) {
      if (!isBackupPathname(download)) return NextResponse.json({ success: false, error: "Invalid backup" }, { status: 400 });
      return NextResponse.redirect(await cloudBackupDownloadUrl(download), 302);
    }
    return NextResponse.json({ success: true, configured: true, data: await listCloudBackups() });
  } catch (e) {
    console.error("GET /api/backups:", e);
    return NextResponse.json({ success: false, error: "Cloud backups load nahi hue" }, { status: 500 });
  }
}

// POST → take a cloud backup right now
export async function POST() {
  if (!blobConfigured()) return notConfigured();
  try {
    return NextResponse.json({ success: true, ...(await createCloudBackup()) });
  } catch (e) {
    console.error("POST /api/backups:", e);
    return NextResponse.json({ success: false, error: "Cloud backup fail hua" }, { status: 500 });
  }
}
