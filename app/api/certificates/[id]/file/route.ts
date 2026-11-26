import { NextRequest, NextResponse } from "next/server";
import { connectDB, CertificateModel } from "@/lib/db";
import { dataUrlResponse } from "@/lib/dataUrl";
import { blobResponse } from "@/lib/blobFiles";

// Serves one certificate's file as raw bytes. The list endpoint omits fileData so
// the gallery stays small (Vercel caps a response at 4.5MB); the browser fetches
// each file here instead, and can cache it since a certificate's file never changes.
export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    const cert = await CertificateModel.findById(params.id).select("fileData filePath mimeType").lean<{ fileData?: string; filePath?: string; mimeType: string }>();
    if (!cert) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    const cacheControl = "private, max-age=31536000, immutable";
    if (cert.filePath) return blobResponse(cert.filePath, { mimeType: cert.mimeType, cacheControl });
    return dataUrlResponse(cert.fileData || "", { mimeType: cert.mimeType, cacheControl });
  } catch (e) {
    console.error("GET /api/certificates/[id]/file:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
