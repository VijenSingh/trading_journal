import { NextRequest, NextResponse } from "next/server";
import { connectDB, CertificateModel } from "@/lib/db";

// Serves one certificate's file as raw bytes. The list endpoint omits fileData so
// the gallery stays small (Vercel caps a response at 4.5MB); the browser fetches
// each file here instead, and can cache it since a certificate's file never changes.
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const cert = await CertificateModel.findById(params.id).select("fileData mimeType").lean<{ fileData: string; mimeType: string }>();
    if (!cert) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    // fileData is a data URL: "data:<mime>;base64,<payload>"
    const comma = cert.fileData.indexOf(",");
    if (!cert.fileData.startsWith("data:") || comma < 0) {
      return NextResponse.json({ success: false, error: "Corrupt file" }, { status: 500 });
    }
    const header = cert.fileData.slice(5, comma);
    const payload = cert.fileData.slice(comma + 1);
    const bytes = header.endsWith(";base64") ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload));
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": cert.mimeType || header.split(";")[0] || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("GET /api/certificates/[id]/file:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
