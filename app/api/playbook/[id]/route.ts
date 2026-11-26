import { NextRequest, NextResponse } from "next/server";
import { connectDB, SetupModel, TradeModel } from "@/lib/db";
import { cleanSetup } from "@/lib/playbookServer";

// GET    → one setup with its images (for the editor)
// PATCH  → edit; a rename also moves the trades tagged with the old name
// DELETE → remove the setup (its trades keep their strategy name)
export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    const st = await SetupModel.findById(params.id).lean<{ images?: { data: string }[] }>();
    if (!st) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...st, images: (st.images || []).map(i => i.data) } });
  } catch (e) {
    console.error("GET /api/playbook/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    const c = cleanSetup(await req.json(), true);
    if (!c.ok) return NextResponse.json({ success: false, error: c.error }, { status: 400 });
    const before = await SetupModel.findById(params.id).select("name").lean<{ name: string }>();
    if (!before) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    const renamed = typeof c.set.name === "string" && c.set.name !== before.name;
    if (renamed && (await SetupModel.exists({ name: c.set.name, _id: { $ne: params.id } }))) {
      return NextResponse.json({ success: false, error: "Is naam ka setup pehle se hai" }, { status: 409 });
    }
    await SetupModel.updateOne({ _id: params.id }, { $set: c.set });
    let moved = 0;
    if (renamed) {
      moved = (await TradeModel.updateMany({ strategy: before.name }, { $set: { strategy: c.set.name } }, { timestamps: false })).modifiedCount;
    }
    return NextResponse.json({ success: true, movedTrades: moved });
  } catch (e) {
    console.error("PATCH /api/playbook/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    await connectDB();
    await SetupModel.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/playbook/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
