import { NextResponse } from "next/server";

// Only these types are ever served inline. Anything else (e.g. text/html or
// image/svg+xml, which can run script on this origin) is sent as a download.
const INLINE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

export function isAllowedUploadType(mime: string): boolean {
  return INLINE_TYPES.has(mime);
}

// Turns a stored "data:<mime>;base64,<payload>" string into a raw-bytes response, so
// list endpoints can leave big base64 blobs out (Vercel caps a response at 4.5MB) and
// the browser fetches each file on its own.
export function dataUrlResponse(dataUrl: string, opts: { mimeType?: string; cacheControl: string }): NextResponse {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) {
    return NextResponse.json({ success: false, error: "Corrupt file" }, { status: 500 });
  }
  const header = dataUrl.slice(5, comma);
  const payload = dataUrl.slice(comma + 1);
  const bytes = header.endsWith(";base64") ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload));
  const declared = (opts.mimeType || header.split(";")[0] || "").toLowerCase();
  const inline = INLINE_TYPES.has(declared);
  const headers: Record<string, string> = {
    "Content-Type": inline ? declared : "application/octet-stream",
    "Cache-Control": opts.cacheControl,
    "X-Content-Type-Options": "nosniff",
  };
  if (!inline) headers["Content-Disposition"] = "attachment";
  return new NextResponse(bytes, { headers });
}
