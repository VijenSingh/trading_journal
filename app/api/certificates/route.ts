export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, CertificateModel } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const propFirm = req.nextUrl.searchParams.get("propFirm");
    const filter = propFirm ? { propFirm } : {};
    const certs = await CertificateModel.find(filter).sort({ createdAt: -1 }).lean();
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
    if (!["evaluation", "payout"].includes(body.type) || !body.fileData) {
      return NextResponse.json({ success: false, error: "Invalid certificate" }, { status: 400 });
    }
    const cert = await CertificateModel.create({
      type: body.type,
      label: body.label || "",
      propFirm: body.propFirm || "",
      fileName: body.fileName || "",
      mimeType: body.mimeType || "",
      fileData: body.fileData,
    });
    return NextResponse.json({ success: true, data: cert }, { status: 201 });
  } catch (e) {
    console.error("POST /api/certificates:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
