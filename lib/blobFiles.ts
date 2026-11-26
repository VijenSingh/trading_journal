import { put, get, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { fileHeaders, parseDataUrl } from "@/lib/dataUrl";

// Trade screenshots and certificate files live in Vercel Blob (private) when a store
// is connected; the DB keeps only the pathname. Without a store (local dev) they stay
// in the DB as base64 data URLs, exactly as before — every reader handles both.

export function blobEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// Lets tests use a throwaway folder in the real store (BLOB_PATH_PREFIX=e2e-test/).
export function blobPath(p: string): string {
  return (process.env.BLOB_PATH_PREFIX || "") + p;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf",
};

// Uploads a data URL; returns the stored pathname, byte size and mime type.
export async function uploadDataUrl(folder: "screenshots" | "certificates", dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("Not a data URL");
  const ext = EXT[parsed.mime] || "bin";
  const res = await put(blobPath(`${folder}/file.${ext}`), parsed.bytes, {
    access: "private",
    contentType: parsed.mime,
    addRandomSuffix: true,
  });
  return { pathname: res.pathname, size: parsed.bytes.length, mime: parsed.mime };
}

// Serves a private blob through this origin (each file is well under the 4.5MB cap).
export async function blobResponse(pathname: string, opts: { mimeType?: string; cacheControl: string }): Promise<NextResponse> {
  const r = await get(pathname, { access: "private" });
  if (!r || r.statusCode !== 200 || !r.stream) {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }
  const mime = opts.mimeType || r.headers.get("content-type") || "";
  return new NextResponse(r.stream as unknown as ReadableStream, { headers: fileHeaders(mime, opts.cacheControl) });
}

// Reads a private blob back into a data URL (for backups, which stay self-contained).
export async function blobToDataUrl(pathname: string, mimeType?: string): Promise<string> {
  const r = await get(pathname, { access: "private" });
  if (!r || r.statusCode !== 200 || !r.stream) throw new Error(`Blob missing: ${pathname}`);
  const bytes = Buffer.from(await new Response(r.stream as unknown as ReadableStream).arrayBuffer());
  const mime = mimeType || r.headers.get("content-type") || "application/octet-stream";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

// Best-effort delete; a leftover file only costs storage, so errors are logged, not thrown.
export async function deleteBlobs(paths: (string | undefined | null)[]): Promise<void> {
  const list = paths.filter((p): p is string => !!p);
  if (!list.length || !blobEnabled()) return;
  try {
    for (let i = 0; i < list.length; i += 500) await del(list.slice(i, i + 500));
  } catch (e) {
    console.error("deleteBlobs:", e);
  }
}

// For a trade create/update body: move an incoming data-URL screenshot into Blob.
//   data:…            → uploaded; body gets screenshotPath, screenshot ""
//   "/api/trades/…"   → the client echoed our own URL back: unchanged, drop the field
//   ""                → screenshot removed: clear screenshotPath too
// Returns true when the body changes which screenshot the trade has.
export async function prepareTradeScreenshot(body: Record<string, unknown>): Promise<boolean> {
  if (!("screenshot" in body)) return false;
  const v = body.screenshot;
  if (typeof v !== "string") { delete body.screenshot; return false; }
  if (v.startsWith("/api/trades/")) { delete body.screenshot; return false; }
  if (v === "") { body.screenshotPath = ""; return true; }
  if (v.startsWith("data:") && blobEnabled()) {
    const { pathname } = await uploadDataUrl("screenshots", v);
    body.screenshotPath = pathname;
    body.screenshot = "";
    return true;
  }
  if (v.startsWith("data:")) { body.screenshotPath = ""; return true; }
  delete body.screenshot; // anything else is not a screenshot we store
  return false;
}
