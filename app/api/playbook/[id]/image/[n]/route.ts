import { NextRequest, NextResponse } from "next/server";
import { connectDB, SetupModel } from "@/lib/db";
import { dataUrlResponse } from "@/lib/dataUrl";

// One example image of a setup, as raw bytes (callers add ?v=<updatedAt> to bust the cache).
export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string; n: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    const st = await SetupModel.findById(params.id).select("images").lean<{ images?: { data: string }[] }>();
    const img = st?.images?.[Number(params.n)];
    if (!img) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return dataUrlResponse(img.data, { cacheControl: "private, max-age=31536000, immutable" });
  } catch (e) {
    console.error("GET /api/playbook/[id]/image/[n]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
