export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, CertificateModel } from "@/lib/db";
import { isAllowedUploadType } from "@/lib/dataUrl";
import { blobEnabled, uploadDataUrl, deleteBlobs } from "@/lib/blobFiles";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const propFirm = req.nextUrl.searchParams.get("propFirm");
    const filter = propFirm ? { propFirm } : {};
    // fileData is left out — the files are fetched one by one from /api/certificates/[id]/file.
    const certs = await CertificateModel.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      // fileSize in bytes: stored for Blob files, estimated from base64 length for inline ones.
      { $addFields: { fileSize: { $ifNull: ["$fileSize", { $multiply: [{ $strLenBytes: { $ifNull: ["$fileData", ""] } }, 0.75] }] } } },
      { $project: { fileData: 0, filePath: 0 } },
    ]);
    return NextResponse.json({ success: true, data: certs });
  } catch (e) {
    console.error("GET /api/certificates:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    if (!["evaluation", "payout"].includes(body.type) || typeof body.fileData !== "string" || !body.fileData.startsWith("data:")) {
      return NextResponse.json({ success: false, error: "Invalid certificate" }, { status: 400 });
    }
    // Only images and PDFs: an uploaded HTML/SVG served from this origin could run script.
    const mimeType = String(body.mimeType || body.fileData.slice(5, body.fileData.indexOf(";")) || "").toLowerCase();
    if (!isAllowedUploadType(mimeType)) {
      return NextResponse.json({ success: false, error: "Sirf image (JPG/PNG/WebP/GIF) ya PDF upload ho sakti hai" }, { status: 400 });
    }
    // With a Blob store the file goes there and the DB keeps only its pathname.
    const stored = blobEnabled()
      ? await uploadDataUrl("certificates", body.fileData)
      : null;
    let cert;
    try {
      cert = await CertificateModel.create({
        type: body.type,
        label: body.label || "",
        propFirm: body.propFirm || "",
        fileName: body.fileName || "",
        mimeType,
        fileData: stored ? "" : body.fileData,
        filePath: stored?.pathname || "",
        fileSize: stored ? stored.size : Math.round(body.fileData.length * 0.75),
      });
    } catch (e) {
      await deleteBlobs([stored?.pathname]);
      throw e;
    }
    const { fileData, filePath, ...meta } = cert.toObject();
    return NextResponse.json({ success: true, data: meta }, { status: 201 });
  } catch (e) {
    console.error("POST /api/certificates:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
