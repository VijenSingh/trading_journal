import { NextRequest, NextResponse } from "next/server";
import { connectDB, TransactionModel } from "@/lib/db";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await TransactionModel.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/balance/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
