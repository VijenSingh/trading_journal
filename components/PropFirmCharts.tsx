"use client";
import { Card, CardTitle, StatCard, EmptyState } from "@/components/ui";
import { Landmark, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { usePropFirmAccounts, groupByFirm, overallSummary } from "@/lib/propfirmAccounts";

const PIE_COLORS = ["#10B981", "#6366F1", "#F59E0B", "#F43F5E", "#8B5CF6", "#06B6D4"];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-700 border border-black/10 rounded-xl p-3 text-xs font-mono shadow-card">
      {label && <div className="text-ink-300 mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || p.payload?.fill }}>
          {p.name}: {Number(p.value) >= 0 ? "" : "-"}₹{Math.abs(Number(p.value)).toLocaleString("en-IN")}
        </div>
      ))}
    </div>
  );
};

export default function PropFirmCharts() {
  const { txns, loading } = usePropFirmAccounts();
  if (loading || txns.length === 0) return null;

  const rows = groupByFirm(txns);
  const overall = overallSummary(rows);

  const barData = rows.map(r => ({ name: r.firm, Investment: r.investment, Payout: r.payout }));
  const payoutPie = rows.filter(r => r.payout > 0).map(r => ({ name: r.firm, value: r.payout }));

  // Cumulative net timeline — running total across all entries, sorted by date
  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const timeline = sorted.map(t => {
    running += t.type === "payout" ? t.amount : -t.amount;
    return { date: t.date.slice(5), net: running };
  });

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Total Accounts" value={overall.accounts} color="blue" icon={<Landmark size={16} />} />
        <StatCard label="Total Investment" value={`₹${overall.investment.toLocaleString("en-IN")}`} color="red" />
        <StatCard label="Total Payout" value={`₹${overall.payout.toLocaleString("en-IN")}`} color="green" icon={<TrendingUp size={16} />} />
        <StatCard
          label="Net Return"
          value={`${overall.net >= 0 ? "+" : "-"}₹${Math.abs(overall.net).toLocaleString("en-IN")}`}
          color={overall.net >= 0 ? "green" : "red"}
          icon={overall.net >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          sub={overall.investment > 0 ? `${(overall.payout / overall.investment).toFixed(1)}x ROI` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2 p-5">
          <CardTitle>Investment vs Payout (per Firm)</CardTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8B85A0" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8B85A0" }} axisLine={false} tickLine={false}
                tickFormatter={v => "₹" + (Math.abs(Number(v)) / 1000).toFixed(0) + "k"} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Investment" fill="#F43F5E" radius={[4, 4, 0, 0]} opacity={0.75} />
              <Bar dataKey="Payout" fill="#10B981" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <CardTitle>Payout Share by Firm</CardTitle>
          {payoutPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={payoutPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {payoutPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.85} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="💰" title="Abhi koi payout nahi" />}
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <CardTitle>Net Return Timeline (Cumulative)</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={timeline} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
            <defs>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={overall.net >= 0 ? "#10B981" : "#F43F5E"} stopOpacity={0.25} />
                <stop offset="95%" stopColor={overall.net >= 0 ? "#10B981" : "#F43F5E"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8B85A0" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#8B85A0" }} axisLine={false} tickLine={false}
              tickFormatter={v => (Number(v) >= 0 ? "+" : "-") + "₹" + (Math.abs(Number(v)) / 1000).toFixed(0) + "k"} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="net" name="Net" stroke={overall.net >= 0 ? "#10B981" : "#F43F5E"} fill="url(#netGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
