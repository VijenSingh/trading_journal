export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { blobConfigured, countInlineFiles, migrateInlineFiles, hasRecentCloudBackup } from "@/lib/backupServer";

// GET  → how many screenshots / certificate files still sit in the DB
// POST → move one batch of them into Blob (the client repeats until remaining is 0)
export async function GET() {
  if (!blobConfigured()) return NextResponse.json({ success: false, configured: false }, { status: 503 });
  try {
    return NextResponse.json({ success: true, remaining: await countInlineFiles() });
  } catch (e) {
    console.error("GET /api/backups/migrate:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function POST() {
  if (!blobConfigured()) return NextResponse.json({ success: false, configured: false }, { status: 503 });
  try {
    if (!(await hasRecentCloudBackup())) {
      return NextResponse.json(
        { success: false, error: "Pehle 'Abhi backup lo' se cloud backup banao — shift karne se pehle backup zaroori hai" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true, ...(await migrateInlineFiles()) });
  } catch (e) {
    console.error("POST /api/backups/migrate:", e);
    return NextResponse.json({ success: false, error: "Files shift nahi ho payi" }, { status: 500 });
  }
}
