import { NextRequest, NextResponse } from "next/server";
import { connectDB, RuleModel } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    if (!body.text?.trim()) {
      return NextResponse.json({ success: false, error: "Text zaroori hai" }, { status: 400 });
    }
    const updated = await RuleModel.findByIdAndUpdate(params.id, { text: body.text.trim() }, { new: true });
    if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("PATCH /api/rules/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await RuleModel.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/rules/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
