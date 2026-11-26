export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel, CertificateModel } from "@/lib/db";

// Backup, step 2: one blob at a time — a trade's screenshot or a certificate's file,
// as the stored data URL. Each one is well under Vercel's 4.5MB response cap.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const kind = req.nextUrl.searchParams.get("kind");
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    let value: string | undefined;
    if (kind === "trade") {
      value = (await TradeModel.findById(id).select("screenshot").lean<{ screenshot?: string }>())?.screenshot;
    } else if (kind === "certificate") {
      value = (await CertificateModel.findById(id).select("fileData").lean<{ fileData?: string }>())?.fileData;
    } else {
      return NextResponse.json({ success: false, error: "Invalid kind" }, { status: 400 });
    }
    if (value === undefined) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, value });
  } catch (e) {
    console.error("GET /api/backup/item:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
