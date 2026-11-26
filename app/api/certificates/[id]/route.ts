import { NextRequest, NextResponse } from "next/server";
import { connectDB, CertificateModel } from "@/lib/db";
import { deleteBlobs } from "@/lib/blobFiles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const update: Record<string, string> = {};
    if (body.label !== undefined) update.label = String(body.label).trim();
    if (body.propFirm !== undefined) update.propFirm = String(body.propFirm).trim();
    if (body.type !== undefined) {
      if (!["evaluation", "payout"].includes(body.type)) {
        return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
      }
      update.type = body.type;
    }
    const updated = await CertificateModel.findByIdAndUpdate(params.id, update, { new: true }).select("-fileData -filePath");
    if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("PATCH /api/certificates/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const removed = await CertificateModel.findByIdAndDelete(params.id).select("filePath").lean<{ filePath?: string }>();
    await deleteBlobs([removed?.filePath]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/certificates/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
