"use client";
import { Trade, MISTAKES } from "@/lib/types";
import { formatPnl, getAnalytics, getCumulative, getMonthStats, fmt } from "@/lib/utils";
import { StatCard, Card, CardTitle, Badge, EmptyState } from "@/components/ui";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Award, AlertTriangle, Plus, Eye } from "lucide-react";

// Safe field helpers
const sp = (v: unknown): string => (typeof v === "string" && v ? v : "");
const np = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : parseFloat(String(v ?? 0)) || 0);
const pairShort = (pair: unknown): string => {
  const p = sp(pair);
  if (!p) return "—";
  return p.split(" ")[0] || p;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-700 border border-white/10 rounded-xl p-3 text-xs font-mono shadow-card">
      <div className="text-ink-300 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {np(p.value) >= 0 ? "+" : ""}₹{Math.abs(np(p.value)).toLocaleString("en-IN")}
        </div>
      ))}
    </div>
  );
};

export default function DashboardClient({ trades, avoided }: { trades: Trade[]; avoided: number[] }) {
  const a = getAnalytics(trades);
  const cumData = getCumulative(trades);
  const monthStats = getMonthStats(trades).slice(-6);
  const recent = trades.slice(0, 8);
  const mistakeScore = (avoided || []).length;
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Top pairs by P&L
  const pairPnl: Record<string, number> = {};
  trades.forEach(t => {
    const p = pairShort(t.pair);
    if (p && p !== "—") pairPnl[p] = (pairPnl[p] || 0) + np(t.pnl);
  });
  const topPairs = Object.entries(pairPnl)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);

  return (
    <div className="p-8 page-transition">
      <PageHeader title="Dashboard" subtitle={today}>
        <Link href="/trade/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-green text-bg-950 rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-glow">
            <Plus size={16} /> New Trade
          </button>
        </Link>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total P&L"
          value={formatPnl(a.totalPnl)}
          sub={`${a.totalTrades} trades total`}
          color={a.totalPnl >= 0 ? "green" : "red"}
          icon={a.totalPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <StatCard
          label="Win Rate"
          value={`${a.winRate}%`}
          sub={`${a.totalWins}W / ${a.totalLosses}L`}
          color={a.winRate >= 50 ? "green" : "red"}
          icon={<Award size={16} />}
        />
        <StatCard
          label="Profit Factor"
          value={a.profitFactor === 999 ? "∞" : fmt(a.profitFactor)}
          sub={`Avg RR: ${fmt(a.avgRR)}`}
          color={a.profitFactor >= 1 ? "green" : "red"}
        />
        <StatCard
          label="Discipline Score"
          value={`${mistakeScore}/8`}
          sub="Aaj ki mistakes avoided"
          color={mistakeScore >= 6 ? "green" : mistakeScore >= 3 ? "amber" : "red"}
          icon={<AlertTriangle size={16} />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Cumulative P&L */}
        <Card className="col-span-2 p-5">
          <CardTitle>Cumulative P&L</CardTitle>
          {cumData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumData} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={a.totalPnl >= 0 ? "#00E676" : "#FF4560"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={a.totalPnl >= 0 ? "#00E676" : "#FF4560"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#4A5870" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#4A5870" }} axisLine={false} tickLine={false}
                  tickFormatter={v => "₹" + Math.abs(np(v) / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cumulative" name="P&L"
                  stroke={a.totalPnl >= 0 ? "#00E676" : "#FF4560"}
                  fill="url(#cumGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📈" title="Koi trade nahi abhi" sub="Pehla trade log karo!" />
          )}
        </Card>

        {/* Win/Loss Pie */}
        <Card className="p-5">
          <CardTitle>Win / Loss</CardTitle>
          {a.totalTrades > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Wins", value: a.totalWins },
                      { name: "Losses", value: a.totalLosses },
                    ]}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value"
                  >
                    <Cell fill="#00E676" opacity={0.85} />
                    <Cell fill="#FF4560" opacity={0.85} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#141C28", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px", fontSize: "12px", fontFamily: "JetBrains Mono",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-around mt-2">
                <div className="text-center">
                  <div className="text-lg font-bold font-mono text-green">{a.totalWins}</div>
                  <div className="text-[10px] text-ink-400">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold font-mono text-red">{a.totalLosses}</div>
                  <div className="text-[10px] text-ink-400">Losses</div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon="📊" title="No data yet" />
          )}
        </Card>
      </div>

      {/* Monthly Bar + Top Pairs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="col-span-2 p-5">
          <CardTitle>Monthly P&L</CardTitle>
          {monthStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthStats} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#4A5870" }} axisLine={false} tickLine={false}
                  tickFormatter={v => sp(v).slice(0, 3)} />
                <YAxis tick={{ fontSize: 10, fill: "#4A5870" }} axisLine={false} tickLine={false}
                  tickFormatter={v => "₹" + Math.abs(np(v) / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                  {monthStats.map((m, i) => (
                    <Cell key={i} fill={np(m.pnl) >= 0 ? "#00E676" : "#FF4560"} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📅" title="No monthly data" />
          )}
        </Card>

        {/* Top Pairs */}
        <Card className="p-5">
          <CardTitle>Top Pairs by P&L</CardTitle>
          {topPairs.length > 0 ? (
            <div className="space-y-3">
              {topPairs.map(([pair, pnl]) => {
                const maxAbs = Math.max(...topPairs.map(([, v]) => Math.abs(v)), 1);
                const pct = Math.abs(pnl) / maxAbs * 100;
                return (
                  <div key={pair}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-ink-200">{pair}</span>
                      <span className={`text-xs font-mono font-semibold ${pnl >= 0 ? "text-green" : "text-red"}`}>
                        {formatPnl(pnl)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-600 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pnl >= 0 ? "#00E676" : "#FF4560", opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="💹" title="No trades yet" />
          )}
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Avg Win" value={formatPnl(a.avgWin)} color="green" />
        <StatCard label="Avg Loss" value={formatPnl(-a.avgLoss)} color="red" />
        <StatCard label="Best Trade" value={formatPnl(a.maxWin)} sub={a.bestPair} color="green" />
        <StatCard label="Worst Trade" value={formatPnl(-a.maxLoss)} sub={a.worstPair} color="red" />
      </div>

      {/* Recent Trades */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="mb-0">Recent Trades</CardTitle>
          <Link href="/journal" className="text-xs text-green hover:text-green-bright flex items-center gap-1 transition-colors">
            <Eye size={12} /> View All
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Date", "Pair", "Type", "Lot", "Entry", "Exit", "P&L", "Strategy", "Result"].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-semibold text-ink-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((t, idx) => {
                  const pnl = np(t.pnl);
                  const pair = pairShort(t.pair);
                  const type = sp(t.type) || "BUY";
                  return (
                    <tr key={sp(t._id) || idx} className="tr-hover border-b border-white/[0.03] last:border-0">
                      <td className="py-3 px-3 text-ink-400 font-mono text-xs">{sp(t.date) || "—"}</td>
                      <td className="py-3 px-3 font-semibold text-ink-100">{pair}</td>
                      <td className="py-3 px-3">
                        <Badge variant={type === "BUY" ? "green" : "red"}>{type}</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-ink-300 text-xs">{np(t.lot) || "—"}</td>
                      <td className="py-3 px-3 font-mono text-ink-300 text-xs">{np(t.entry) || "—"}</td>
                      <td className="py-3 px-3 font-mono text-ink-300 text-xs">{np(t.exit) || "—"}</td>
                      <td className={`py-3 px-3 font-mono font-semibold text-xs ${pnl >= 0 ? "text-green" : "text-red"}`}>
                        {formatPnl(pnl)}
                      </td>
                      <td className="py-3 px-3 text-ink-400 text-xs">{sp(t.strategy) || "—"}</td>
                      <td className="py-3 px-3">
                        <Badge variant={pnl >= 0 ? "green" : "red"}>{pnl >= 0 ? "PROFIT" : "LOSS"}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="📭" title="Koi trade abhi nahi" sub="Pehla trade log karo aur yahan dikhega!" />
        )}
      </Card>
    </div>
  );
}
