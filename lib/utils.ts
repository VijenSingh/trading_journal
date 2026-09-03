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
// ─── Day-level aggregation (P&L per calendar day) ───────────────────────────
export interface DayBucket { date: string; pnl: number; trades: number }
export function getDailyBuckets(trades: Trade[]): DayBucket[] {
  const map: Record<string, DayBucket> = {};
  trades.forEach(t => {
    const d = s(t.date);
    if (!d) return;
    if (!map[d]) map[d] = { date: d, pnl: 0, trades: 0 };
    map[d].pnl += n(t.pnl);
    map[d].trades++;
  });
  return Object.values(map);
}

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface RowStat { key: string; label: string; pnl: number; pct: number; days: number; best: number; worst: number }

// Performance broken down by weekday, aggregated at the day level (not per-trade).
export function getDayOfWeekStats(trades: Trade[]): RowStat[] {
  const daily = getDailyBuckets(trades);
  const totalPnl = daily.reduce((s, d) => s + d.pnl, 0);
  const buckets: Record<number, DayBucket[]> = {};
  daily.forEach(d => {
    const dow = new Date(d.date + "T00:00:00").getDay();
    (buckets[dow] ||= []).push(d);
  });
  return DOW_NAMES.map((label, i) => {
    const ds = buckets[i] || [];
    const pnl = ds.reduce((s, d) => s + d.pnl, 0);
    return {
      key: String(i), label,
      pnl, pct: totalPnl ? (pnl / totalPnl) * 100 : 0,
      days: ds.length,
      best: ds.length ? Math.max(...ds.map(d => d.pnl)) : 0,
      worst: ds.length ? Math.min(...ds.map(d => d.pnl)) : 0,
    };
  });
}

// Performance broken down by month, aggregated at the day level (not per-trade).
export function getMonthTableStats(trades: Trade[]): RowStat[] {
  const daily = getDailyBuckets(trades);
  const totalPnl = daily.reduce((s, d) => s + d.pnl, 0);
  const buckets: Record<string, DayBucket[]> = {};
  daily.forEach(d => { const m = d.date.slice(0, 7); (buckets[m] ||= []).push(d); });
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ds]) => {
      const pnl = ds.reduce((s, d) => s + d.pnl, 0);
      return {
        key: month, label: getMonthLabel(month),
        pnl, pct: totalPnl ? (pnl / totalPnl) * 100 : 0,
        days: ds.length,
        best: Math.max(...ds.map(d => d.pnl)),
        worst: Math.min(...ds.map(d => d.pnl)),
      };
    });
}

export function getMistakeFreq(trades: Trade[]) {
  const f: Record<number, number> = {};
  trades.forEach(t => (t.mistakes || []).forEach(m => { f[m] = (f[m] || 0) + 1; }));
  return f;
}
export function getToday() { return new Date().toISOString().split("T")[0]; }
export function getNow() { return new Date().toTimeString().slice(0, 5); }
export function getThisMonth() { return getToday().slice(0, 7); }
// ISO-8601 week key, e.g. "2026-W36"
export function getWeekKey(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ─── CSV Export ────────────────────────────────────────────────────────────
function csvCell(v: unknown): string {
  const str = s(v);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
export function tradesToCsv(trades: Trade[]): string {
  const headers = [
    "Date", "Time", "Pair", "Type", "Lot", "Entry", "SL", "Target", "Exit",
    "P&L", "Pips", "RR", "Strategy", "Session", "Emotion", "Mistakes", "Tags",
    "Reasoning", "Lesson", "Rules Followed",
  ];
  const rows = trades.map(t => [
    t.date, t.time, t.pair, t.type, t.lot, t.entry, t.sl, t.target, t.exit,
    t.pnl, t.pips, t.rr, t.strategy, t.session, t.emotion,
    (t.mistakes || []).join("; "), (t.tags || []).join("; "),
    t.reasoning, t.lesson, t.rulesFollowed,
  ].map(csvCell).join(","));
  return [headers.join(","), ...rows].join("\n");
}
// ─── Screenshot compression (client-side, before storing as base64) ────────
export function compressImage(file: File, maxWidth = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
