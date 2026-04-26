import { Trade, MonthStat, MONTH_NAMES } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...i: ClassValue[]) { return twMerge(clsx(i)); }

// Safe string helpers
const s = (v: unknown): string => (typeof v === "string" ? v : String(v ?? ""));
const n = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : parseFloat(String(v ?? 0)) || 0);

export function formatPnl(val: unknown): string {
  const num = n(val);
  const abs = Math.abs(num).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return (num >= 0 ? "+₹" : "-₹") + abs;
}
export function formatCurrency(val: unknown): string {
  return "₹" + Math.abs(n(val)).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
export function fmt(val: unknown, d = 2): string {
  return n(val).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function getMonthLabel(ym: string) {
  const parts = s(ym).split("-");
  const y = parts[0] || "";
  const m = parseInt(parts[1] || "1") - 1;
  return (MONTH_NAMES[m] || "Unknown") + " " + y;
}
export function getMonthStats(trades: Trade[]): MonthStat[] {
  const by: Record<string, Trade[]> = {};
  trades.forEach((t) => {
    const key = s(t.date).slice(0, 7) || "unknown";
    if (!by[key]) by[key] = [];
    by[key].push(t);
  });
  return Object.entries(by)
    .sort(([a], [b]) => s(a).localeCompare(s(b)))
    .map(([month, ts]) => {
      const wins = ts.filter(t => n(t.pnl) > 0);
      const losses = ts.filter(t => n(t.pnl) < 0);
      const pnl = ts.reduce((acc, t) => acc + n(t.pnl), 0);
      return {
        month,
        label: getMonthLabel(month),
        pnl,
        trades: ts.length,
        wins: wins.length,
        losses: losses.length,
        winRate: ts.length ? Math.round(wins.length / ts.length * 100) : 0,
        avgPnl: ts.length ? pnl / ts.length : 0,
        bestTrade: ts.length ? Math.max(...ts.map(t => n(t.pnl))) : 0,
        worstTrade: ts.length ? Math.min(...ts.map(t => n(t.pnl))) : 0,
      };
    });
}
export function getCumulative(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => {
    const da = s(a.date), db = s(b.date);
    const ta = s(a.time), tb = s(b.time);
    return da.localeCompare(db) || ta.localeCompare(tb);
  });
  let cum = 0;
  return sorted.map((t, i) => ({
    name: s(t.date).slice(5) || String(i + 1),
    pnl: n(t.pnl),
    cumulative: (cum += n(t.pnl)),
    idx: i + 1,
    pair: s(t.pair) || "Unknown",
  }));
}
export function getAnalytics(trades: Trade[]) {
  const empty = {
    totalPnl: 0, totalTrades: 0, totalWins: 0, totalLosses: 0,
    winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0,
    maxWin: 0, maxLoss: 0, avgRR: 0,
    longestWinStreak: 0, longestLossStreak: 0,
    bestPair: "—", worstPair: "—",
  };
  if (!trades.length) return empty;

  const wins = trades.filter(t => n(t.pnl) > 0);
  const losses = trades.filter(t => n(t.pnl) < 0);
  const totalPnl = trades.reduce((acc, t) => acc + n(t.pnl), 0);
  const grossWin = wins.reduce((acc, t) => acc + n(t.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((acc, t) => acc + n(t.pnl), 0));

  let mW = 0, mL = 0, cW = 0, cL = 0;
  [...trades]
    .sort((a, b) => s(a.date).localeCompare(s(b.date)))
    .forEach(t => {
      if (n(t.pnl) > 0) { cW++; cL = 0; mW = Math.max(mW, cW); }
      else { cL++; cW = 0; mL = Math.max(mL, cL); }
    });

  const pairPnl: Record<string, number> = {};
  trades.forEach(t => {
    const p = s(t.pair) || "Unknown";
    pairPnl[p] = (pairPnl[p] || 0) + n(t.pnl);
  });
  const pe = Object.entries(pairPnl);
  const rrTrades = trades.filter(t => n(t.rr) > 0);

  return {
    totalPnl, totalTrades: trades.length,
    totalWins: wins.length, totalLosses: losses.length,
    winRate: Math.round(wins.length / trades.length * 100),
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? parseFloat((grossWin / grossLoss).toFixed(2)) : grossWin > 0 ? 999 : 0,
    maxWin: wins.length ? Math.max(...wins.map(t => n(t.pnl))) : 0,
    maxLoss: losses.length ? Math.max(...losses.map(t => Math.abs(n(t.pnl)))) : 0,
    avgRR: rrTrades.length ? parseFloat((rrTrades.reduce((acc, t) => acc + n(t.rr), 0) / rrTrades.length).toFixed(2)) : 0,
    longestWinStreak: mW, longestLossStreak: mL,
    bestPair: pe.length ? [...pe].sort((a, b) => b[1] - a[1])[0][0] : "—",
    worstPair: pe.length ? [...pe].sort((a, b) => a[1] - b[1])[0][0] : "—",
  };
}
export function getMistakeFreq(trades: Trade[]) {
  const f: Record<number, number> = {};
  trades.forEach(t => (t.mistakes || []).forEach(m => { f[m] = (f[m] || 0) + 1; }));
  return f;
}
export function getToday() { return new Date().toISOString().split("T")[0]; }
export function getNow() { return new Date().toTimeString().slice(0, 5); }
