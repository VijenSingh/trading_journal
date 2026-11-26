import { NextRequest, NextResponse } from "next/server";
import { connectDB, AccountTxnModel } from "@/lib/db";

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    await AccountTxnModel.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/propfirm-accounts/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
