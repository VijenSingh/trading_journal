export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, RuleModel } from "@/lib/db";

const DEFAULT_RULES: { category: "pre" | "during" | "post" | "emergency"; text: string }[] = [
  { category: "pre", text: "Sirf 2 trades maximum per day. Koi exception nahi — chahe profit ho ya loss. Count karo." },
  { category: "pre", text: "Lot size pehle se fix karo. Loss ho ya profit — lot size KABHI increase nahi karoge loss cover ke liye." },
  { category: "pre", text: "SL aur Target DONO set karo trade lene SE PEHLE. Entry ke baad change nahi hoga kuch." },
  { category: "pre", text: "Sirf clear market structure mein trade karo. Sideways market = NO TRADE. Wait karo, force nahi." },
  { category: "pre", text: "Ek fixed strategy use karo. Setup nahi mila? No trade lena. FOMO pe trade nahi lena kabhi." },
  { category: "pre", text: "Daily max loss limit set karo. Woh limit hit? Din khatam. Screen band karo. Kal fresh start." },
  { category: "during", text: "SL hit hone do — kabhi manually band mat karo SL se pehle. SL hit hona = plan sahi tha." },
  { category: "during", text: "Target tak wait karo. Beech mein early exit = pattern todna = consistency khatam." },
  { category: "during", text: "Trade mein ho to doosra chart mat dekho. Ek trade, ek focus. Distraction = bad decision." },
  { category: "during", text: "Emotion feel ho — panic, greed, revenge? Kuch mat karo. Keyboard se haath hata. 10 deep breaths." },
  { category: "post", text: "Loss ke baad 30 minute MANDATORY break. Chart band karo, paani piyo, bahar jao. No exceptions." },
  { category: "post", text: "Har trade ka journal likho — iss app mein. Entry reason, exit, emotion, lesson — sab." },
  { category: "post", text: "Profit ke baad bhi STOP. 2 trade complete? Din khatam. Profit protect karna bhi discipline hai." },
  { category: "post", text: "Weekend mein apna journal review karo. Patterns dhundho, mistakes count karo, next week plan banao." },
  { category: "emergency", text: "Agar 3 consecutive losses ho gayein — screen band karo. Koi bhi trade mat lo aaj." },
  { category: "emergency", text: "Agar anger, frustration ya desperation feel ho — trading ke liye unfit ho. Kal aao." },
  { category: "emergency", text: "Agar propfirm daily drawdown limit 50% hit kar li — band karo, risk nahi le sakte." },
  { category: "emergency", text: "Agar koi cheez 'definitely work karega' lag raha ho — ye overconfidence hai. Ruko." },
  { category: "emergency", text: "Agar tum soch rahe ho 'ek aur trade se sab recover ho jayega' — bilkul mat lena. YE SABSE DANGEROUS THOUGHT HAI." },
];

export async function GET() {
  try {
    await connectDB();
    let rules = await RuleModel.find({}).sort({ category: 1, order: 1, createdAt: 1 }).lean();
    if (rules.length === 0) {
      await RuleModel.insertMany(DEFAULT_RULES.map((r, i) => ({ ...r, order: i })));
      rules = await RuleModel.find({}).sort({ category: 1, order: 1, createdAt: 1 }).lean();
    }
    return NextResponse.json({ success: true, data: rules });
  } catch (e) {
    console.error("GET /api/rules:", e);
    return NextResponse.json({ success: false, error: "DB error", data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    if (!body.text?.trim() || !["pre", "during", "post", "emergency"].includes(body.category)) {
      return NextResponse.json({ success: false, error: "Invalid rule" }, { status: 400 });
    }
    const count = await RuleModel.countDocuments({ category: body.category });
    const rule = await RuleModel.create({ category: body.category, text: body.text.trim(), order: count });
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (e) {
    console.error("POST /api/rules:", e);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }
}
