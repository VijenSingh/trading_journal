import { connectDB, TradeModel, DailyMistakeModel } from "@/lib/db";
import DashboardClient from "./DashboardClient";
import { getToday } from "@/lib/utils";

async function getData() {
  try {
    await connectDB();
    const [trades, mistakeDoc] = await Promise.all([
      TradeModel.find({}).sort({ date: -1, time: -1 }).lean(),
      DailyMistakeModel.findOne({ date: getToday() }).lean(),
    ]);
    return {
      trades: JSON.parse(JSON.stringify(trades)),
      avoided: (mistakeDoc as any)?.avoided ?? [],
    };
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    return { trades: [], avoided: [] };
  }
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { trades, avoided } = await getData();
  return <DashboardClient trades={trades} avoided={avoided} />;
}
