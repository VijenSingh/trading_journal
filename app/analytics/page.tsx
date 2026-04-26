"use client";
import { useState, useEffect } from "react";
import { Trade, MISTAKES } from "@/lib/types";
import { getAnalytics, getCumulative, getMistakeFreq, fmt, formatPnl, cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardTitle, StatCard, EmptyState, Loading } from "@/components/ui";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-700 border border-white/10 rounded-xl p-3 text-xs font-mono shadow-card">
      <div className="text-ink-300 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || "#E8EDF5" }}>
          {p.name}: {typeof p.value === "number"
            ? (p.value >= 0 ? "+" : "") + "₹" + Math.abs(p.value).toLocaleString("en-IN")
            : p.value}
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then(r => r.json())
      .then(j => {
        if (j.success && Array.isArray(j.data)) {
          setTrades(j.data);
        } else {
          setError("Data load nahi hua: " + (j.error || "unknown"));
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><Loading /></div>;

  if (error) return (
    <div className="p-8">
      <div className="p-4 bg-red/10 border border-red/30 rounded-xl text-red text-sm">{error}</div>
    </div>
  );

  const a = getAnalytics(trades);
  const cumData = getCumulative(trades);
  const mistakeFreq = getMistakeFreq(trades);
  const totalT = trades.length || 1;

  // Strategy breakdown
  const stratPnl: Record<string, { pnl: number; trades: number; wins: number }> = {};
  trades.forEach(t => {
    const s = (t.strategy && String(t.strategy).trim()) ? String(t.strategy).trim() : "Unknown";
    if (!stratPnl[s]) stratPnl[s] = { pnl: 0, trades: 0, wins: 0 };
    stratPnl[s].pnl += Number(t.pnl) || 0;
    stratPnl[s].trades++;
    if ((Number(t.pnl) || 0) > 0) stratPnl[s].wins++;
  });
  const stratData = Object.entries(stratPnl)
    .map(([name, d]) => ({ name, ...d, winRate: Math.round(d.wins / d.trades * 100) }))
    .sort((a, b) => b.pnl - a.pnl);

  // Session breakdown
  const sessPnl: Record<string, number> = {};
  trades.forEach(t => { const s = String(t.session || "Unknown"); sessPnl[s] = (sessPnl[s] || 0) + (Number(t.pnl) || 0); });
  const sessData = Object.entries(sessPnl).map(([name, pnl]) => ({ name, pnl })).sort((a, b) => b.pnl - a.pnl);

  // Day of week
  const dayPnl: Record<string, { pnl: number; count: number }> = {};
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  trades.forEach(t => {
    if (!t.date) return;
    const d = days[new Date(String(t.date)).getDay()];
    if (!dayPnl[d]) dayPnl[d] = { pnl: 0, count: 0 };
    dayPnl[d].pnl += Number(t.pnl) || 0;
    dayPnl[d].count++;
  });
  const dayData = days.map(d => ({ name: d, ...(dayPnl[d] || { pnl: 0, count: 0 }) }));

  // Radar
  const radarData = [
    { metric: "Win Rate", value: a.winRate },
    { metric: "Profit Factor", value: Math.min(100, a.profitFactor * 20) },
    { metric: "Avg RR", value: Math.min(100, a.avgRR * 25) },
    { metric: "Discipline", value: Math.max(0, 100 - (Object.values(mistakeFreq).reduce((s, v) => s + v, 0) / totalT) * 10) },
    { metric: "Consistency", value: Math.min(100, a.longestWinStreak * 15) },
  ];

  return (
    <div className="p-8 page-transition">
      <PageHeader title="Analytics" subtitle={`${trades.length} trades ka deep analysis`} />

      {trades.length === 0 ? (
        <EmptyState icon="📊" title="Koi trade nahi abhi" sub="Trades log karo to analytics yahan dikhega" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Profit Factor" value={a.profitFactor === 999 ? "∞" : fmt(a.profitFactor)} color={a.profitFactor >= 1.5 ? "green" : "red"} sub="Gross Win / Gross Loss" />
            <StatCard label="Avg Win" value={formatPnl(a.avgWin)} color="green" sub={`Max: ${formatPnl(a.maxWin)}`} />
            <StatCard label="Avg Loss" value={formatPnl(-a.avgLoss)} color="red" sub={`Max: ${formatPnl(-a.maxLoss)}`} />
            <StatCard label="Avg R:R" value={fmt(a.avgRR)} color={a.avgRR >= 2 ? "green" : "amber"} sub="Risk:Reward" />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Win Streak" value={a.longestWinStreak} color="green" sub="Longest wins" />
            <StatCard label="Loss Streak" value={a.longestLossStreak} color="red" sub="Longest losses" />
            <StatCard label="Best Pair" value={String(a.bestPair).split(" ")[0]} color="green" />
            <StatCard label="Worst Pair" value={String(a.worstPair).split(" ")[0]} color="red" />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="col-span-2 p-5">
              <CardTitle>Equity Curve</CardTitle>
              {cumData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={cumData} margin={{ top:5,right:5,bottom:0,left:10 }}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E676" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{fontSize:10,fill:"#4A5870"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#4A5870"}} axisLine={false} tickLine={false}
                      tickFormatter={v=>"₹"+Math.abs(Number(v)/1000).toFixed(0)+"k"}/>
                    <Tooltip content={<TT />} />
                    <Area type="monotone" dataKey="cumulative" name="P&L" stroke="#00E676" fill="url(#eq)" strokeWidth={2} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState icon="📈" title="Chart ke liye aur data chahiye" />}
            </Card>

            <Card className="p-5">
              <CardTitle>Trader Scorecard</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} margin={{top:10,right:10,bottom:10,left:10}}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="metric" tick={{fontSize:9,fill:"#4A5870"}}/>
                  <Radar dataKey="value" stroke="#00E676" fill="#00E676" fillOpacity={0.15} strokeWidth={2}/>
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <CardTitle>Strategy Performance</CardTitle>
              {stratData.length > 0 ? (
                <div className="space-y-3">
                  {stratData.map(s => {
                    const maxAbs = Math.max(...stratData.map(x => Math.abs(x.pnl)), 1);
                    return (
                      <div key={s.name} className="flex items-center gap-3">
                        <div className="text-xs font-medium text-ink-200 w-32 truncate">{s.name}</div>
                        <div className="flex-1 h-6 bg-bg-700 rounded-lg overflow-hidden relative">
                          <div className="h-full rounded-lg" style={{
                            width:`${Math.min(100,Math.abs(s.pnl)/maxAbs*100)}%`,
                            background:s.pnl>=0?"rgba(0,230,118,0.5)":"rgba(255,69,96,0.5)"
                          }}/>
                          <span className="absolute inset-0 flex items-center px-2 text-[10px] font-mono text-ink-100">
                            {s.winRate}% WR · {s.trades}T
                          </span>
                        </div>
                        <div className={`text-xs font-mono font-bold w-20 text-right ${s.pnl>=0?"text-green":"text-red"}`}>
                          {formatPnl(s.pnl)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyState icon="📋" title="Strategy data nahi" />}
            </Card>

            <Card className="p-5">
              <CardTitle>Day of Week Performance</CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dayData} margin={{top:5,right:5,bottom:0,left:10}}>
                  <XAxis dataKey="name" tick={{fontSize:10,fill:"#4A5870"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:"#4A5870"}} axisLine={false} tickLine={false}
                    tickFormatter={v=>"₹"+Math.abs(Number(v)/1000).toFixed(0)+"k"}/>
                  <Tooltip content={<TT />}/>
                  <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>
                    {dayData.map((d,i)=><Cell key={i} fill={d.pnl>=0?"#00E676":"#FF4560"} opacity={0.75}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-5 mb-6">
            <CardTitle>Mistakes Frequency Analysis</CardTitle>
            <div className="grid grid-cols-4 gap-3">
              {MISTAKES.map(m => {
                const count = mistakeFreq[m.id] || 0;
                const pct = Math.round(count / totalT * 100);
                return (
                  <div key={m.id} className={cn(
                    "p-4 rounded-xl border",
                    count > 0 ? "bg-red/5 border-red/15" : "bg-green/5 border-green/15"
                  )}>
                    <div className="text-xs font-semibold text-ink-200 mb-2">{m.name}</div>
                    <div className={`text-2xl font-bold font-mono ${count>0?"text-red":"text-green"}`}>{count}</div>
                    <div className={`text-[10px] mt-1 ${count>0?"text-red/70":"text-green/70"}`}>
                      {pct}% of trades · {count===0?"✅ Clean!":"⚠️ Needs work"}
                    </div>
                    <div className="mt-2 h-1 bg-bg-600 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${pct}%`,background:count>0?"#FF4560":"#00E676",opacity:0.7}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {sessData.length > 0 && (
            <Card className="p-5">
              <CardTitle>Session Performance</CardTitle>
              <div className="grid grid-cols-4 gap-3">
                {sessData.map(s=>(
                  <div key={s.name} className="stat-card">
                    <div className="text-xs text-ink-400 mb-2">{s.name}</div>
                    <div className={`text-xl font-bold font-mono ${s.pnl>=0?"text-green":"text-red"}`}>{formatPnl(s.pnl)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
