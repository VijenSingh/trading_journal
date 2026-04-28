"use client";
import { useState, useEffect } from "react";
import { Trade } from "@/lib/types";
import { formatPnl, cn } from "@/lib/utils";
import { useTradeData } from "@/lib/useTradeData";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardTitle, Loading, StatCard } from "@/components/ui";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, BarChart2 } from "lucide-react";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const cum = payload.find((p: any) => p.dataKey === "cumulative");
  const daily = payload.find((p: any) => p.dataKey === "dailyPnl");
  return (
    <div className="bg-bg-700 border border-white/10 rounded-xl p-3 text-xs font-mono shadow-card min-w-[160px]">
      <div className="text-ink-300 mb-2 font-sans text-[11px]">{label}</div>
      {cum && (
        <div className={`font-semibold ${Number(cum.value) >= 0 ? "text-green" : "text-red"}`}>
          Cumulative: {Number(cum.value) >= 0 ? "+" : ""}₹{Math.abs(Number(cum.value)).toLocaleString("en-IN")}
        </div>
      )}
      {daily && (
        <div className={`mt-1 ${Number(daily.value) >= 0 ? "text-green/70" : "text-red/70"}`}>
          Day P&L: {Number(daily.value) >= 0 ? "+" : ""}₹{Math.abs(Number(daily.value)).toLocaleString("en-IN")}
        </div>
      )}
    </div>
  );
};

// ─── Trading Calendar ─────────────────────────────────────────────────────────
function TradingCalendar({ dailyData }: {
  dailyData: Record<string, { pnl: number; trades: number; wins: number }>
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Max abs pnl this month for intensity scaling
  const thisMonthDates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  });
  const monthPnls = thisMonthDates.map(d => Math.abs(dailyData[d]?.pnl || 0));
  const maxPnl = Math.max(...monthPnls, 1);

  // Month totals
  const monthTotal = thisMonthDates.reduce((s, d) => s + (dailyData[d]?.pnl || 0), 0);
  const monthTrades = thisMonthDates.reduce((s, d) => s + (dailyData[d]?.trades || 0), 0);
  const monthWins = thisMonthDates.reduce((s, d) => s + (dailyData[d]?.wins || 0), 0);

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <CardTitle className="mb-0">Trading Calendar</CardTitle>
          <div className="flex items-center gap-4 mt-1 text-[11px] font-mono">
            <span className={monthTotal >= 0 ? "text-green" : "text-red"}>
              {monthTotal >= 0 ? "+" : ""}₹{Math.abs(monthTotal).toLocaleString("en-IN")} this month
            </span>
            <span className="text-ink-400">{monthTrades} trades</span>
            {monthTrades > 0 && (
              <span className="text-ink-400">{Math.round(monthWins / monthTrades * 100)}% WR</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-700 hover:bg-bg-600 text-ink-300 transition-all">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-ink-100 w-36 text-center">{monthName}</span>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-700 hover:bg-bg-600 text-ink-300 transition-all">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="h-px bg-white/[0.05] my-4" />

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-ink-500 py-2 tracking-widest">{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-[72px] rounded-xl" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const data = dailyData[dateStr];
          const isToday = new Date().toISOString().slice(0, 10) === dateStr;
          const hasTrades = !!data && data.trades > 0;
          const pnl = data?.pnl || 0;
          const isProfit = pnl > 0;
          const intensity = hasTrades ? Math.min(0.85, 0.15 + (Math.abs(pnl) / maxPnl) * 0.7) : 0;
          const winPct = data ? Math.round(data.wins / data.trades * 100) : 0;

          return (
            <div key={i} className={cn(
              "h-[72px] rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden border transition-all cursor-default",
              !hasTrades && "bg-bg-800 border-transparent",
              hasTrades && isProfit && "border-green/20",
              hasTrades && !isProfit && "border-red/20",
              isToday && !hasTrades && "border-blue/30 bg-blue/5",
            )}
              style={hasTrades ? {
                background: isProfit
                  ? `rgba(0,230,118,${intensity * 0.25})`
                  : `rgba(255,69,96,${intensity * 0.25})`
              } : {}}
            >
              {/* Day number */}
              <div className={cn(
                "text-xs font-bold",
                isToday ? "text-blue" : hasTrades ? "text-ink-200" : "text-ink-600"
              )}>
                {day}
              </div>

              {/* P&L and win% */}
              {hasTrades && (
                <div>
                  <div className={cn(
                    "text-[11px] font-bold font-mono leading-none",
                    isProfit ? "text-green" : "text-red"
                  )}>
                    {isProfit ? "+" : ""}₹{Math.abs(pnl) >= 1000
                      ? (Math.abs(pnl) / 1000).toFixed(1) + "k"
                      : Math.abs(pnl).toFixed(0)}
                  </div>
                  <div className="text-[9px] text-ink-500 mt-0.5 font-mono">
                    {winPct}% · {data.trades}T
                  </div>
                </div>
              )}

              {/* Today indicator */}
              {isToday && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.05] flex-wrap">
        <span className="flex items-center gap-2 text-[11px] text-ink-400">
          <span className="w-3 h-3 rounded bg-green/40" /> Profit Day
        </span>
        <span className="flex items-center gap-2 text-[11px] text-ink-400">
          <span className="w-3 h-3 rounded bg-red/30" /> Loss Day
        </span>
        <span className="flex items-center gap-2 text-[11px] text-ink-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue" /> Today
        </span>
        <span className="ml-auto text-[10px] text-ink-600 font-mono">% = win rate · T = trades</span>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const { trades: hookTrades, loading: hookLoading } = useTradeData();
  useEffect(() => { setTrades(hookTrades); }, [hookTrades]);
  useEffect(() => { setLoading(hookLoading); }, [hookLoading]);

  if (loading) return <div className="p-4 md:p-8"><Loading /></div>;

  // ── Build daily P&L map ──────────────────────────────────────────────────
  const dailyMap: Record<string, { pnl: number; trades: number; wins: number }> = {};
  trades.forEach(t => {
    const d = String(t.date || "");
    if (!d) return;
    if (!dailyMap[d]) dailyMap[d] = { pnl: 0, trades: 0, wins: 0 };
    dailyMap[d].pnl += Number(t.pnl) || 0;
    dailyMap[d].trades++;
    if ((Number(t.pnl) || 0) > 0) dailyMap[d].wins++;
  });

  // ── Cumulative chart data ────────────────────────────────────────────────
  const sortedDates = Object.keys(dailyMap).sort();
  let cumulative = 0;
  const chartData = sortedDates.map(date => {
    const dayPnl = dailyMap[date].pnl;
    cumulative += dayPnl;
    return {
      date: date.slice(5).replace("-", "/"), // "04/26"
      fullDate: date,
      dailyPnl: parseFloat(dayPnl.toFixed(2)),
      cumulative: parseFloat(cumulative.toFixed(2)),
    };
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const wins = trades.filter(t => (Number(t.pnl) || 0) > 0);
  const losses = trades.filter(t => (Number(t.pnl) || 0) < 0);
  const tradingDays = Object.keys(dailyMap).length;
  const profitDays = Object.values(dailyMap).filter(d => d.pnl > 0).length;
  const lossDays = Object.values(dailyMap).filter(d => d.pnl < 0).length;

  // Best and worst day
  const bestDay = sortedDates.reduce(
    (b, d) => dailyMap[d].pnl > (dailyMap[b]?.pnl ?? -Infinity) ? d : b, sortedDates[0] || ""
  );
  const worstDay = sortedDates.reduce(
    (b, d) => dailyMap[d].pnl < (dailyMap[b]?.pnl ?? Infinity) ? d : b, sortedDates[0] || ""
  );

  // Max drawdown from peak
  let peak = 0, maxDD = 0, runningPnl = 0;
  sortedDates.forEach(d => {
    runningPnl += dailyMap[d].pnl;
    if (runningPnl > peak) peak = runningPnl;
    const dd = peak - runningPnl;
    if (dd > maxDD) maxDD = dd;
  });

  const isPositive = totalPnl >= 0;
  const yMin = chartData.length ? Math.min(...chartData.map(d => d.cumulative)) : 0;
  const yMax = chartData.length ? Math.max(...chartData.map(d => d.cumulative)) : 0;
  const yPadding = Math.abs(yMax - yMin) * 0.1 || 1000;

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Performance Overview" subtitle="Trade entries se automatic cumulative P&L aur calendar" />

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Cumulative P&L"
          value={`${totalPnl >= 0 ? "+" : ""}₹${Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          color={isPositive ? "green" : "red"}
          sub={`${trades.length} total trades`}
          icon={isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <StatCard
          label="Trading Days"
          value={tradingDays}
          color="blue"
          sub={`${profitDays} profit · ${lossDays} loss`}
          icon={<Calendar size={16} />}
        />
        <StatCard
          label="Win Rate"
          value={`${trades.length ? Math.round(wins.length / trades.length * 100) : 0}%`}
          color={wins.length / (trades.length || 1) >= 0.5 ? "green" : "red"}
          sub={`${wins.length}W / ${losses.length}L`}
        />
        <StatCard
          label="Best Day"
          value={bestDay && dailyMap[bestDay]
            ? `${dailyMap[bestDay].pnl >= 0 ? "+" : "-"}₹${Math.abs(dailyMap[bestDay].pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
            : "—"}
          color={bestDay && dailyMap[bestDay]?.pnl >= 0 ? "green" : "red"}
          sub={bestDay || "—"}
        />
        <StatCard
          label="Worst Day"
          value={worstDay && dailyMap[worstDay]
            ? `${dailyMap[worstDay].pnl >= 0 ? "+" : "-"}₹${Math.abs(dailyMap[worstDay].pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
            : "—"}
          color="red"
          sub={worstDay || "—"}
        />
        <StatCard
          label="Max Drawdown"
          value={`-₹${maxDD.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          color={maxDD > 0 ? "red" : "default"}
          sub="Peak se neeche"
          icon={<BarChart2 size={16} />}
        />
      </div>

      {/* Cumulative P&L Chart */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="mb-1">Cumulative P&L Curve</CardTitle>
            <div className="text-xs text-ink-400">Har trade entry ke baad cumulative sum — exactly like propfirm dashboard</div>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold font-mono border",
            isPositive ? "bg-green/10 text-green border-green/25" : "bg-red/10 text-red border-red/25"
          )}>
            {totalPnl >= 0 ? "+" : ""}₹{Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-ink-400">
            <div className="text-3xl mb-3">📈</div>
            <div className="text-sm">Koi trade nahi abhi</div>
            <div className="text-xs text-ink-500 mt-1">Trades enter karo — chart automatically ban jayega</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 15 }}>
              <defs>
                <linearGradient id="cumGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E676" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00E676" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cumRedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF4560" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF4560" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#4A5870", fontFamily: "JetBrains Mono" }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#4A5870", fontFamily: "JetBrains Mono" }}
                axisLine={false} tickLine={false}
                domain={[yMin - yPadding, yMax + yPadding]}
                tickFormatter={v => {
                  const n = Number(v);
                  return (n >= 0 ? "+" : "") + (Math.abs(n) >= 1000 ? "₹" + (Math.abs(n) / 1000).toFixed(1) + "k" : "₹" + Math.abs(n).toFixed(0));
                }}
              />

              <Tooltip content={<ChartTooltip />} />

              {/* Zero reference line */}
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative P&L"
                stroke={isPositive ? "#00E676" : "#FF4560"}
                fill={isPositive ? "url(#cumGreenGrad)" : "url(#cumRedGrad)"}
                strokeWidth={2.5}
                dot={chartData.length <= 15 ? { fill: isPositive ? "#00E676" : "#FF4560", r: 4, strokeWidth: 0 } : false}
                activeDot={{ r: 6, fill: isPositive ? "#00E676" : "#FF4560", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Below chart — daily breakdown mini stats */}
        {chartData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-4 gap-4">
            {[
              { label: "Total Profit Days", value: `${profitDays} days`, color: "text-green" },
              { label: "Total Loss Days", value: `${lossDays} days`, color: "text-red" },
              { label: "Avg Profit Day", value: profitDays ? `+₹${Math.round(Object.values(dailyMap).filter(d => d.pnl > 0).reduce((s, d) => s + d.pnl, 0) / profitDays).toLocaleString("en-IN")}` : "—", color: "text-green" },
              { label: "Avg Loss Day", value: lossDays ? `-₹${Math.abs(Math.round(Object.values(dailyMap).filter(d => d.pnl < 0).reduce((s, d) => s + d.pnl, 0) / lossDays)).toLocaleString("en-IN")}` : "—", color: "text-red" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-widest">{s.label}</div>
                <div className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Daily P&L Bar — per day breakdown */}
      {chartData.length > 0 && (
        <Card className="p-5 mb-6">
          <CardTitle>Daily P&L Breakdown</CardTitle>
          <div className="space-y-2">
            {[...chartData].reverse().slice(0, 15).map((d, i) => {
              const maxAbs = Math.max(...chartData.map(c => Math.abs(c.dailyPnl)), 1);
              const pct = Math.abs(d.dailyPnl) / maxAbs * 100;
              const isPos = d.dailyPnl >= 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-xs font-mono text-ink-400 w-16 flex-shrink-0">{d.date}</div>
                  <div className="flex-1 h-7 bg-bg-700 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all"
                      style={{ width: `${pct}%`, background: isPos ? "rgba(0,230,118,0.45)" : "rgba(255,69,96,0.45)" }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-[11px] font-mono font-semibold"
                      style={{ color: isPos ? "#00E676" : "#FF4560" }}>
                      {isPos ? "+" : ""}₹{Math.abs(d.dailyPnl).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className={`text-xs font-mono w-10 text-right font-bold ${isPos ? "text-green" : "text-red"}`}>
                    {dailyMap[d.fullDate]?.trades || 0}T
                  </div>
                </div>
              );
            })}
            {chartData.length > 15 && (
              <div className="text-center text-xs text-ink-500 pt-1">Last 15 days shown · Total {chartData.length} days</div>
            )}
          </div>
        </Card>
      )}

      {/* Trading Calendar */}
      <TradingCalendar dailyData={dailyMap} />
    </div>
  );
}
