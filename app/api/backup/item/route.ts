export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, TradeModel, CertificateModel, SetupModel } from "@/lib/db";
import { blobToDataUrl } from "@/lib/blobFiles";

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
    // Always answered as a data URL, wherever the file lives, so backup files stay self-contained.
    let value: string | undefined;
    if (kind === "trade") {
      const t = await TradeModel.findById(id).select("screenshot screenshotPath").lean<{ screenshot?: string; screenshotPath?: string }>();
      value = t?.screenshotPath ? await blobToDataUrl(t.screenshotPath) : t?.screenshot;
    } else if (kind === "certificate") {
      const c = await CertificateModel.findById(id).select("fileData filePath mimeType").lean<{ fileData?: string; filePath?: string; mimeType?: string }>();
      value = c?.filePath ? await blobToDataUrl(c.filePath, c.mimeType) : c?.fileData;
    } else if (kind === "setup") {
      const st = await SetupModel.findById(id).select("images").lean<{ images?: { data: string }[] }>();
      if (!st) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, value: st.images || [] });
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
