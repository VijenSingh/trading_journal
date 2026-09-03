"use client";
import { useState, useMemo } from "react";
import { Trade } from "@/lib/types";
import { getDailyBuckets, formatPnl, cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DOW_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CELL = 14;
const GAP = 4;
const COL = CELL + GAP;

function colorFor(pnl: number, maxAbs: number): string {
  if (maxAbs === 0) return "";
  const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
  const alpha = 0.3 + intensity * 0.65;
  return pnl >= 0 ? `rgba(0,230,118,${alpha})` : `rgba(255,69,96,${alpha})`;
}

function compactPnl(v: number): string {
  const abs = Math.abs(v);
  const num = abs >= 1000 ? (abs / 1000).toFixed(abs >= 10000 ? 0 : 1) + "k" : abs.toFixed(0);
  return (v >= 0 ? "+₹" : "-₹") + num;
}

export default function YearHeatmap({ trades }: { trades: Trade[] }) {
  const dailyMap = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number }> = {};
    getDailyBuckets(trades).forEach(d => { map[d.date] = { pnl: d.pnl, trades: d.trades }; });
    return map;
  }, [trades]);

  const years = useMemo(() => {
    const ys = new Set(Object.keys(dailyMap).map(d => parseInt(d.slice(0, 4))));
    ys.add(new Date().getFullYear());
    return Array.from(ys).sort((a, b) => a - b);
  }, [dailyMap]);

  const [year, setYear] = useState(() => years[years.length - 1]);
  const yearIdx = years.indexOf(year);

  // Build weeks: columns of 7 days (Sun-Sat), from the Sunday on/before Jan 1
  // through the Saturday on/after Dec 31.
  const { weeks, monthCols, monthTotals, maxAbs, yearPnl, tradingDays } = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const start = new Date(jan1);
    start.setDate(start.getDate() - start.getDay());
    const dec31 = new Date(year, 11, 31);
    const end = new Date(dec31);
    end.setDate(end.getDate() + (6 - end.getDay()));

    const weeksArr: { date: Date; inYear: boolean; pnl: number; trades: number }[][] = [];
    let cur = new Date(start);
    let max = 1, totalPnl = 0, days = 0;
    const monthColsArr: { label: string; monthIdx: number; col: number }[] = [];
    const monthTotalsMap: Record<number, number> = {};
    let lastMonth = -1;
    let col = 0;

    while (cur <= end) {
      const week: { date: Date; inYear: boolean; pnl: number; trades: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const inYear = cur.getFullYear() === year;
        const key = cur.toISOString().slice(0, 10);
        const data = dailyMap[key];
        if (inYear && cur.getMonth() !== lastMonth && cur.getDate() <= 7) {
          monthColsArr.push({ label: MONTH_LABELS[cur.getMonth()], monthIdx: cur.getMonth(), col });
          lastMonth = cur.getMonth();
        }
        if (inYear && data) {
          max = Math.max(max, Math.abs(data.pnl));
          totalPnl += data.pnl;
          days++;
          monthTotalsMap[cur.getMonth()] = (monthTotalsMap[cur.getMonth()] || 0) + data.pnl;
        }
        week.push({ date: new Date(cur), inYear, pnl: data?.pnl || 0, trades: data?.trades || 0 });
        cur.setDate(cur.getDate() + 1);
      }
      weeksArr.push(week);
      col++;
    }
    return { weeks: weeksArr, monthCols: monthColsArr, monthTotals: monthTotalsMap, maxAbs: max, yearPnl: totalPnl, tradingDays: days };
  }, [dailyMap, year]);

  const MONTH_GAP = 8;
  const monthStartCols = useMemo(() => new Set(monthCols.map(m => m.col)), [monthCols]);
  const colOffsets = useMemo(() => {
    let offset = 0;
    return weeks.map((_, wi) => {
      if (monthStartCols.has(wi) && wi !== 0) offset += MONTH_GAP;
      return wi * COL + offset;
    });
  }, [weeks, monthStartCols]);
  const gridWidth = (colOffsets[colOffsets.length - 1] ?? 0) + COL;

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <CardTitle className="mb-0">Yearly Heatmap</CardTitle>
          <div className="flex items-center gap-4 mt-1 text-[11px] font-mono">
            <span className={yearPnl >= 0 ? "text-green" : "text-red"}>{formatPnl(yearPnl)} in {year}</span>
            <span className="text-ink-400">{tradingDays} trading days</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(years[yearIdx - 1])} disabled={yearIdx <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-700 hover:bg-bg-600 text-ink-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-ink-100 w-14 text-center">{year}</span>
          <button onClick={() => setYear(years[yearIdx + 1])} disabled={yearIdx >= years.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-700 hover:bg-bg-600 text-ink-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="h-px bg-black/[0.05] my-4" />

      <div className="overflow-x-auto -mx-1">
        <div className="px-1" style={{ minWidth: gridWidth + 36 }}>
          {/* Month labels + per-month P&L */}
          <div className="relative mb-2" style={{ marginLeft: 32, height: 30 }}>
            {monthCols.map((m, i) => {
              const total = monthTotals[m.monthIdx] || 0;
              return (
                <div key={i} className="absolute leading-tight" style={{ left: colOffsets[m.col] }}>
                  <div className="text-[10px] font-semibold text-ink-300 font-mono whitespace-nowrap">{m.label}</div>
                  <div className={cn(
                    "text-[9px] font-mono font-semibold whitespace-nowrap",
                    total === 0 ? "text-ink-600" : total > 0 ? "text-green" : "text-red"
                  )}>
                    {total === 0 ? "—" : compactPnl(total)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex">
            {/* Weekday labels */}
            <div className="flex flex-col gap-[4px] mr-1" style={{ width: 26 }}>
              {DOW_LABELS.map((d, i) => (
                <div key={i} className="text-[10px] text-ink-400 font-mono flex items-center" style={{ height: CELL }}>{d}</div>
              ))}
            </div>

            {/* Weeks grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[4px]"
                style={{ marginRight: GAP, marginLeft: monthStartCols.has(wi) && wi !== 0 ? MONTH_GAP : 0 }}>
                {week.map((day, di) => {
                  const hasTrade = day.inYear && day.trades > 0;
                  return (
                    <div key={di}
                      title={day.inYear ? `${day.date.toISOString().slice(0, 10)}: ${hasTrade ? formatPnl(day.pnl) + ` (${day.trades} trade${day.trades > 1 ? "s" : ""})` : "No trades"}` : ""}
                      className={cn("rounded-[3px] border", day.inYear ? "cursor-default border-black/[0.05]" : "opacity-0 border-transparent")}
                      style={{
                        width: CELL, height: CELL,
                        background: hasTrade ? colorFor(day.pnl, maxAbs) : "rgba(0,0,0,0.06)",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black/[0.05] text-[11px] text-ink-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: "rgba(255,69,96,0.75)" }} /> Loss
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: "rgba(0,0,0,0.06)" }} /> No trades
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: "rgba(0,230,118,0.75)" }} /> Profit
        </span>
        <span className="ml-auto text-ink-500">Hover ek din pe P&amp;L dekhne ke liye</span>
      </div>
    </Card>
  );
}
