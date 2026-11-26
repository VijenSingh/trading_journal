import { NextRequest, NextResponse } from "next/server";
import { connectDB, AccountModel, AccountTxnModel, TradeModel, ACCOUNT_STATUSES } from "@/lib/db";
import { isDateKey } from "@/lib/tradeFields";

// PATCH  → edit name/size/notes/startDate; a status change is appended to statusHistory
// DELETE → removes the account, its fee/payout entries, and its id from trades
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const b = await req.json();
    const set: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return NextResponse.json({ success: false, error: "Name zaroori hai" }, { status: 400 });
      set.name = name;
    }
    if (b.size !== undefined) {
      const size = Number(b.size);
      if (!(size > 0)) return NextResponse.json({ success: false, error: "Size galat hai" }, { status: 400 });
      set.size = size;
    }
    if (b.notes !== undefined) set.notes = String(b.notes);
    if (b.startDate !== undefined) {
      if (!isDateKey(b.startDate)) return NextResponse.json({ success: false, error: "Start date galat hai" }, { status: 400 });
      set.startDate = b.startDate;
    }
    const update: Record<string, unknown> = { $set: set };
    if (b.status !== undefined) {
      if (!ACCOUNT_STATUSES.includes(b.status)) return NextResponse.json({ success: false, error: "Status galat hai" }, { status: 400 });
      const date = isDateKey(b.statusDate) ? b.statusDate : new Date().toISOString().slice(0, 10);
      set.status = b.status;
      update.$push = { statusHistory: { status: b.status, date } };
    }
    const updated = await AccountModel.findByIdAndUpdate(params.id, update, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("PATCH /api/accounts/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const removed = await AccountModel.findByIdAndDelete(params.id);
    if (!removed) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    await Promise.all([
      AccountTxnModel.deleteMany({ accountId: params.id }),
      TradeModel.updateMany({ accounts: params.id }, { $pull: { accounts: params.id } }, { timestamps: false }),
    ]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/accounts/[id]:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
