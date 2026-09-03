"use client";
import { useState, useEffect } from "react";
import { Trade } from "@/lib/types";
import { getMonthStats, formatPnl, fmt, cn, getThisMonth, getWeekKey } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardTitle, StatCard, EmptyState, Loading, Badge, Button, Label } from "@/components/ui";
import { useTradeData } from "@/lib/useTradeData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { Target } from "lucide-react";
import toast from "react-hot-toast";

function GoalsCard({ trades }: { trades: Trade[] }) {
  const thisMonth = getThisMonth();
  const thisWeek = getWeekKey();
  const [targetPnl, setTargetPnl] = useState("");
  const [maxLossLimit, setMaxLossLimit] = useState("");
  const [editingTarget, setEditingTarget] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/goals?periodType=month&periodKey=${thisMonth}`).then(r => r.json())
      .then(j => { if (j.success) setTargetPnl(j.data.targetPnl ? String(j.data.targetPnl) : ""); });
    fetch(`/api/goals?periodType=week&periodKey=${thisWeek}`).then(r => r.json())
      .then(j => { if (j.success) setMaxLossLimit(j.data.maxLossLimit ? String(j.data.maxLossLimit) : ""); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTarget = async () => {
    setSaving(true);
    try {
      await fetch("/api/goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodType: "month", periodKey: thisMonth, targetPnl: parseFloat(targetPnl) || 0 }),
      });
      toast.success("Monthly target saved ✅");
      setEditingTarget(false);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const saveLimit = async () => {
    setSaving(true);
    try {
      await fetch("/api/goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodType: "week", periodKey: thisWeek, maxLossLimit: parseFloat(maxLossLimit) || 0 }),
      });
      toast.success("Weekly loss limit saved ✅");
      setEditingLimit(false);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const monthPnl = trades.filter(t => (t.date || "").startsWith(thisMonth)).reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const weekPnl = trades.filter(t => getWeekKey(t.date) === thisWeek).reduce((s, t) => s + (Number(t.pnl) || 0), 0);

  const target = parseFloat(targetPnl) || 0;
  const targetPct = target > 0 ? Math.max(0, Math.min(100, (monthPnl / target) * 100)) : 0;

  const limit = parseFloat(maxLossLimit) || 0;
  const weekLoss = Math.abs(Math.min(0, weekPnl));
  const limitPct = limit > 0 ? Math.min(100, (weekLoss / limit) * 100) : 0;
  const limitBreached = limit > 0 && weekLoss >= limit;

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Target size={14} className="text-green" />
        <CardTitle className="mb-0">Goals & Risk Limits</CardTitle>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Monthly target */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Is Mahine Ka Target (₹)</Label>
            {!editingTarget && <button onClick={() => setEditingTarget(true)} className="text-[11px] text-blue hover:text-blue/80">Edit</button>}
          </div>
          {editingTarget ? (
            <div className="flex gap-2">
              <input type="number" className="inp" placeholder="e.g. 20000" value={targetPnl} onChange={e => setTargetPnl(e.target.value)} />
              <Button variant="primary" size="sm" onClick={saveTarget} loading={saving}>Save</Button>
            </div>
          ) : target > 0 ? (
            <>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className={monthPnl >= 0 ? "text-green" : "text-red"}>{formatPnl(monthPnl)}</span>
                <span className="text-ink-400">/ ₹{target.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-2 bg-bg-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${targetPct}%`, background: monthPnl >= target ? "#10B981" : "#6366F1" }} />
              </div>
              {monthPnl >= target && <div className="text-[11px] text-green mt-1.5">🎯 Target achieve ho gaya!</div>}
            </>
          ) : (
            <div className="text-xs text-ink-500">Koi target set nahi — Edit pe click karo</div>
          )}
        </div>

        {/* Weekly max loss limit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Is Hafte Ki Max Loss Limit (₹)</Label>
            {!editingLimit && <button onClick={() => setEditingLimit(true)} className="text-[11px] text-blue hover:text-blue/80">Edit</button>}
          </div>
          {editingLimit ? (
            <div className="flex gap-2">
              <input type="number" className="inp" placeholder="e.g. 5000" value={maxLossLimit} onChange={e => setMaxLossLimit(e.target.value)} />
              <Button variant="primary" size="sm" onClick={saveLimit} loading={saving}>Save</Button>
            </div>
          ) : limit > 0 ? (
            <>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className={limitBreached ? "text-red" : "text-ink-300"}>-₹{weekLoss.toLocaleString("en-IN")}</span>
                <span className="text-ink-400">/ ₹{limit.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-2 bg-bg-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${limitPct}%`, background: limitBreached ? "#F43F5E" : "#F59E0B" }} />
              </div>
              {limitBreached && <div className="text-[11px] text-red mt-1.5">🚨 Limit cross ho gayi — is hafte ke liye ruko</div>}
            </>
          ) : (
            <div className="text-xs text-ink-500">Koi limit set nahi — Edit pe click karo</div>
          )}
        </div>
      </div>
    </Card>
  );
}

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-700 border border-black/10 rounded-xl p-3 text-xs font-mono shadow-card">
      <div className="text-ink-300 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {(Number(p.value) >= 0 ? "+" : "")}₹{Math.abs(Number(p.value)).toLocaleString("en-IN")}
        </div>
      ))}
    </div>
  );
};

export default function MonthlyPage() {
  const { trades, loading } = useTradeData();

  if (loading) return <div className="p-4 md:p-8"><Loading /></div>;

  const stats = getMonthStats(trades);
  const totalPnl = stats.reduce((s, m) => s + m.pnl, 0);
  const bestMonth = stats.length ? stats.reduce((b, m) => m.pnl > b.pnl ? m : b) : null;
  const worstMonth = stats.length ? stats.reduce((b, m) => m.pnl < b.pnl ? m : b) : null;

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Monthly P&L" subtitle={`${trades.length} trades · ${stats.length} months`} />

      <GoalsCard trades={trades} />

      {trades.length === 0 ? (
        <EmptyState icon="📅" title="Koi data nahi" sub="Trades log karo!" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <StatCard label="Total P&L" value={formatPnl(totalPnl)} color={totalPnl >= 0 ? "green" : "red"} />
            <StatCard label="Total Months" value={stats.length} color="blue" sub="Trading kiye" />
            <StatCard label="Best Month" value={bestMonth ? formatPnl(bestMonth.pnl) : "—"} color="green" sub={bestMonth?.label} />
            <StatCard label="Worst Month" value={worstMonth ? formatPnl(worstMonth.pnl) : "—"} color="red" sub={worstMonth?.label} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <CardTitle>Monthly P&L Bar</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats} margin={{top:5,right:5,bottom:0,left:10}}>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:"#8B85A0"}} axisLine={false} tickLine={false}
                    tickFormatter={v=>String(v).slice(0,3)}/>
                  <YAxis tick={{fontSize:10,fill:"#8B85A0"}} axisLine={false} tickLine={false}
                    tickFormatter={v=>"₹"+Math.abs(Number(v)/1000).toFixed(0)+"k"}/>
                  <Tooltip content={<TT />}/>
                  <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>
                    {stats.map((m,i)=><Cell key={i} fill={m.pnl>=0?"#10B981":"#F43F5E"} opacity={0.8}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <CardTitle>Win Rate Trend</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats} margin={{top:5,right:5,bottom:0,left:10}}>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:"#8B85A0"}} axisLine={false} tickLine={false}
                    tickFormatter={v=>String(v).slice(0,3)}/>
                  <YAxis tick={{fontSize:10,fill:"#8B85A0"}} axisLine={false} tickLine={false}
                    domain={[0,100]} tickFormatter={v=>v+"%"}/>
                  <Tooltip contentStyle={{background:"#FFFFFF",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"10px",fontSize:"12px",fontFamily:"JetBrains Mono"}}/>
                  <Line type="monotone" dataKey="winRate" name="Win %" stroke="#6366F1" strokeWidth={2} dot={{fill:"#6366F1",r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="space-y-3">
            {[...stats].reverse().map(m => (
              <Card key={m.month} className="p-5 card-hover">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                  <div className="min-w-0 md:min-w-[140px]">
                    <div className="text-sm font-semibold text-ink-100">{m.label}</div>
                    <div className="text-xs text-ink-400 font-mono mt-0.5">{m.trades} trades</div>
                  </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center min-w-[280px]">
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
                  <div className="text-right">
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
