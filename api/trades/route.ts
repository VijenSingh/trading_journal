import { connectDB } from "@/lib/mongodb";
import Trade from "@/models/Trade";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  const trades = await Trade.find().sort({ date: 1 });
  return NextResponse.json(trades);
}

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();

  const { entry, exit, lot, type } = body;

  // ✅ SAFE NUMBER CONVERSION
  const e = Number(entry);
  const ex = Number(exit);
  const l = Number(lot);

  if (!e || !ex || !l) {
    return NextResponse.json({ error: "Invalid data" });
  }

  let pnl = 0;

  if (type === "BUY") {
    pnl = (ex - e) * l * 100;
  } else {
    pnl = (e - ex) * l * 100;
  }

  const trade = await Trade.create({
    ...body,
    pnl,
  });

  return NextResponse.json(trade);
}