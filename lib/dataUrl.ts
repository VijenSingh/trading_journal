import { NextResponse } from "next/server";

// Only these types are ever served inline. Anything else (e.g. text/html or
// image/svg+xml, which can run script on this origin) is sent as a download.
const INLINE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

export function isAllowedUploadType(mime: string): boolean {
  return INLINE_TYPES.has(mime);
}

// Response headers for serving a stored file from this origin.
export function fileHeaders(mime: string, cacheControl: string): Record<string, string> {
  const declared = (mime || "").toLowerCase();
  const inline = INLINE_TYPES.has(declared);
  const headers: Record<string, string> = {
    "Content-Type": inline ? declared : "application/octet-stream",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  };
  if (!inline) headers["Content-Disposition"] = "attachment";
  return headers;
}

// "data:<mime>;base64,<payload>" → { mime, bytes }, or null if it is not a data URL.
export function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) return null;
  const header = dataUrl.slice(5, comma);
  const payload = dataUrl.slice(comma + 1);
  const bytes = header.endsWith(";base64") ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload));
  return { mime: header.split(";")[0].toLowerCase(), bytes };
}

// Turns a stored data URL into a raw-bytes response, so list endpoints can leave big
// base64 blobs out (Vercel caps a response at 4.5MB) and the browser fetches each file on its own.
export function dataUrlResponse(dataUrl: string, opts: { mimeType?: string; cacheControl: string }): NextResponse {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return NextResponse.json({ success: false, error: "Corrupt file" }, { status: 500 });
  return new NextResponse(new Uint8Array(parsed.bytes), { headers: fileHeaders(opts.mimeType || parsed.mime, opts.cacheControl) });
}
