"use client";
import { useState, useMemo, useEffect } from "react";
import { useTradeData } from "@/lib/useTradeData";
import { getAnalytics, formatPnl, cn } from "@/lib/utils";
import { MISTAKES, Trade } from "@/lib/types";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardTitle, StatCard, EmptyState, Loading, Button } from "@/components/ui";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekRange(offsetWeeks: number) {
  const now = new Date();
  const day = now.getDay() || 7; // Mon=1 .. Sun=7
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day + 1 + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return fmt(d);
  });
  const label = `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  return { start: fmt(monday), end: fmt(sunday), days, label };
}

export default function WeeklyReviewPage() {
  const { trades, loading } = useTradeData();
  const [offset, setOffset] = useState(0);
  const [mistakeHistory, setMistakeHistory] = useState<{ date: string; avoided: number[] }[]>([]);

  useEffect(() => {
    fetch("/api/mistakes?history=true", { cache: "no-store" })
      .then(r => r.json())
      .then(j => { if (j.success) setMistakeHistory(j.data || []); })
      .catch(() => {});
  }, []);

  const thisWeek = useMemo(() => getWeekRange(offset), [offset]);
  const lastWeek = useMemo(() => getWeekRange(offset - 1), [offset]);

  const weekTrades = useMemo(() => trades.filter(t => t.date >= thisWeek.start && t.date <= thisWeek.end), [trades, thisWeek]);
  const prevWeekTrades = useMemo(() => trades.filter(t => t.date >= lastWeek.start && t.date <= lastWeek.end), [trades, lastWeek]);

  const a = useMemo(() => getAnalytics(weekTrades), [weekTrades]);
  const prevA = useMemo(() => getAnalytics(prevWeekTrades), [prevWeekTrades]);

  const mistakeFreq = useMemo(() => {
    const f: Record<number, number> = {};
    weekTrades.forEach(t => (t.mistakes || []).forEach(m => { f[m] = (f[m] || 0) + 1; }));
    return f;
  }, [weekTrades]);
  const totalMistakes = Object.values(mistakeFreq).reduce((s, v) => s + v, 0);

  const dayRows = useMemo(() => {
    return thisWeek.days.map((date, i) => {
      const dayTrades = weekTrades.filter(t => t.date === date);
      const pnl = dayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
      const avoided = mistakeHistory.find(h => h.date === date)?.avoided?.length ?? null;
      return { date, label: DAY_LABELS[i], trades: dayTrades.length, pnl, avoided };
    });
  }, [thisWeek, weekTrades, mistakeHistory]);

  const pnlDelta = a.totalPnl - prevA.totalPnl;
  const winRateDelta = a.winRate - prevA.winRate;
  const isCurrentWeek = offset === 0;

  if (loading) return <div className="p-4 md:p-8"><Loading /></div>;

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Weekly Review" subtitle={thisWeek.label}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOffset(o => o - 1)}>
            <ChevronLeft size={14} /> Pichla Hafta
          </Button>
          <Button variant="ghost" size="sm" disabled={isCurrentWeek} onClick={() => setOffset(o => Math.min(0, o + 1))}>
            Agla Hafta <ChevronRight size={14} />
          </Button>
        </div>
      </PageHeader>

      {weekTrades.length === 0 ? (
        <EmptyState icon="📅" title="Is hafte koi trade nahi" sub="Is hafte ke liye review karne ko kuch nahi hai" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <StatCard label="Trades" value={weekTrades.length} sub={`Pichla hafta: ${prevWeekTrades.length}`} />
            <StatCard
              label="Win Rate" value={`${a.winRate}%`} color={a.winRate >= 50 ? "green" : "red"}
              sub={prevWeekTrades.length ? `${winRateDelta >= 0 ? "+" : ""}${winRateDelta}% vs pichla` : undefined}
            />
            <StatCard
              label="Week P&L" value={formatPnl(a.totalPnl)} color={a.totalPnl >= 0 ? "green" : "red"}
              sub={prevWeekTrades.length ? `${formatPnl(pnlDelta)} vs pichla` : undefined}
            />
            <StatCard label="Mistakes" value={totalMistakes} color={totalMistakes === 0 ? "green" : "red"} sub={`${weekTrades.length} trades mein`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {a.bestTrade && (
              <Card className="p-4 flex items-center justify-between bg-green/5 border-green/15">
                <div>
                  <div className="text-xs text-ink-400 mb-1">🏆 Best Trade Is Hafte</div>
                  <div className="text-sm text-ink-200 font-medium">{a.bestTrade.pair} · {a.bestTrade.date}</div>
                </div>
                <div className="text-xl font-bold font-mono text-green">{formatPnl(a.bestTrade.pnl)}</div>
              </Card>
            )}
            {a.worstTrade && (
              <Card className="p-4 flex items-center justify-between bg-red/5 border-red/15">
                <div>
                  <div className="text-xs text-ink-400 mb-1">💀 Worst Trade Is Hafte</div>
                  <div className="text-sm text-ink-200 font-medium">{a.worstTrade.pair} · {a.worstTrade.date}</div>
                </div>
                <div className="text-xl font-bold font-mono text-red">{formatPnl(a.worstTrade.pnl)}</div>
              </Card>
            )}
          </div>

          <Card className="p-5 mb-6">
            <CardTitle>Din-Ba-Din Breakdown</CardTitle>
            <div className="space-y-1.5">
              {dayRows.map(d => (
                <div key={d.date} className="flex items-center gap-3 p-2.5 bg-bg-700 rounded-lg text-xs">
                  <span className="w-10 font-semibold text-ink-300">{d.label}</span>
                  <span className="w-20 font-mono text-ink-400">{d.date.slice(5)}</span>
                  <span className="text-ink-400">{d.trades ? `${d.trades} trade${d.trades > 1 ? "s" : ""}` : "—"}</span>
                  <span className={cn("ml-auto font-mono font-semibold", d.pnl > 0 ? "text-green" : d.pnl < 0 ? "text-red" : "text-ink-400")}>
                    {d.trades ? formatPnl(d.pnl) : "—"}
                  </span>
                  {d.avoided != null && (
                    <span className={cn("text-[10px] font-mono px-2 py-1 rounded-lg", d.avoided >= 6 ? "bg-green/10 text-green" : "bg-amber/10 text-amber")}>
                      {d.avoided}/{MISTAKES.length} avoided
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {totalMistakes > 0 && (
            <Card className="p-5">
              <CardTitle>Is Hafte Ki Mistakes</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MISTAKES.filter(m => mistakeFreq[m.id]).sort((x, y) => mistakeFreq[y.id] - mistakeFreq[x.id]).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-red/5 border border-red/15 rounded-xl">
                    <span className="text-sm font-medium text-ink-200">{m.name}</span>
                    <span className="text-sm font-mono font-bold text-red">{mistakeFreq[m.id]}x</span>
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
