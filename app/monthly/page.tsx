"use client";
import { useState, useEffect } from "react";
import { Trade } from "@/lib/types";
import { getMonthStats, formatPnl, fmt } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardTitle, StatCard, EmptyState, Loading, Badge } from "@/components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from "recharts";

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-700 border border-white/10 rounded-xl p-3 text-xs font-mono shadow-card">
      <div className="text-ink-300 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.value >= 0 ? "+" : ""}₹{Math.abs(p.value).toLocaleString("en-IN")}
        </div>
      ))}
    </div>
  );
};

export default function MonthlyPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(j => setTrades(j.data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><Loading /></div>;

  const stats = getMonthStats(trades);
  const totalPnl = stats.reduce((s, m) => s + m.pnl, 0);
  const bestMonth = stats.length ? stats.reduce((b, m) => m.pnl > b.pnl ? m : b) : null;
  const worstMonth = stats.length ? stats.reduce((b, m) => m.pnl < b.pnl ? m : b) : null;

  return (
    <div className="p-8 page-transition">
      <PageHeader title="Monthly P&L" subtitle="Month-wise performance breakdown" />

      {trades.length === 0 ? (
        <EmptyState icon="📅" title="Koi data nahi" sub="Trades log karo!" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total P&L" value={formatPnl(totalPnl)} color={totalPnl >= 0 ? "green" : "red"} />
            <StatCard label="Total Months" value={stats.length} color="blue" sub="Trading kiye" />
            <StatCard label="Best Month" value={bestMonth ? formatPnl(bestMonth.pnl) : "—"} color="green" sub={bestMonth?.label} />
            <StatCard label="Worst Month" value={worstMonth ? formatPnl(worstMonth.pnl) : "—"} color="red" sub={worstMonth?.label} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <CardTitle>Monthly P&L Bar</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats} margin={{top:5,right:5,bottom:0,left:10}}>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:"#4A5870"}} axisLine={false} tickLine={false}
                    tickFormatter={v=>v.slice(0,3)}/>
                  <YAxis tick={{fontSize:10,fill:"#4A5870"}} axisLine={false} tickLine={false}
                    tickFormatter={v=>"₹"+Math.abs(v/1000).toFixed(0)+"k"}/>
                  <Tooltip content={<TT />}/>
                  <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>
                    {stats.map((m,i)=><Cell key={i} fill={m.pnl>=0?"#00E676":"#FF4560"} opacity={0.8}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <CardTitle>Win Rate Trend</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats} margin={{top:5,right:5,bottom:0,left:10}}>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:"#4A5870"}} axisLine={false} tickLine={false}
                    tickFormatter={v=>v.slice(0,3)}/>
                  <YAxis tick={{fontSize:10,fill:"#4A5870"}} axisLine={false} tickLine={false}
                    domain={[0,100]} tickFormatter={v=>v+"%"}/>
                  <Tooltip contentStyle={{background:"#141C28",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",fontSize:"12px",fontFamily:"JetBrains Mono"}}/>
                  <Line type="monotone" dataKey="winRate" name="Win %" stroke="#4D8EFF" strokeWidth={2} dot={{fill:"#4D8EFF",r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Month cards */}
          <div className="space-y-3">
            {[...stats].reverse().map(m => (
              <Card key={m.month} className="p-5 card-hover">
                <div className="flex items-center gap-6">
                  <div className="min-w-[140px]">
                    <div className="text-sm font-semibold text-ink-100">{m.label}</div>
                    <div className="text-xs text-ink-400 font-mono mt-0.5">{m.trades} trades</div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-ink-400 mb-1 font-mono">
                      <span>{m.wins}W / {m.losses}L</span>
                      <span>Win Rate: {m.winRate}%</span>
                    </div>
                    <div className="h-2 bg-bg-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full flex">
                        <div style={{width:`${m.winRate}%`,background:"rgba(0,230,118,0.6)"}}/>
                        <div style={{width:`${100-m.winRate}%`,background:"rgba(255,69,96,0.3)"}}/>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center min-w-[280px]">
                    <div>
                      <div className="text-[10px] text-ink-400 mb-1">Best Trade</div>
                      <div className="text-xs font-mono font-semibold text-green">{formatPnl(m.bestTrade)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-ink-400 mb-1">Avg P&L</div>
                      <div className={`text-xs font-mono font-semibold ${m.avgPnl>=0?"text-green":"text-red"}`}>{formatPnl(m.avgPnl)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-ink-400 mb-1">Worst Trade</div>
                      <div className="text-xs font-mono font-semibold text-red">{formatPnl(m.worstTrade)}</div>
                    </div>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <div className={`text-xl font-bold font-mono ${m.pnl>=0?"text-green":"text-red"}`}>{formatPnl(m.pnl)}</div>
                    <Badge variant={m.pnl>=0?"green":"red"} className="mt-1">{m.pnl>=0?"PROFIT":"LOSS"}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
