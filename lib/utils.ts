import { Trade, MonthStat, MONTH_NAMES } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...i: ClassValue[]) { return twMerge(clsx(i)); }

export function formatPnl(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return (n >= 0 ? "+₹" : "-₹") + abs;
}
export function formatCurrency(n: number): string {
  return "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
export function fmt(n: number, d = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function getMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return MONTH_NAMES[parseInt(m) - 1] + " " + y;
}
export function getMonthStats(trades: Trade[]): MonthStat[] {
  const by: Record<string, Trade[]> = {};
  trades.forEach((t) => { const k = t.date.slice(0,7); if (!by[k]) by[k]=[]; by[k].push(t); });
  return Object.entries(by).sort(([a],[b])=>(a||'').localeCompare(b||'')).map(([month, ts]) => {
    const wins = ts.filter(t=>t.pnl>0), losses = ts.filter(t=>t.pnl<0);
    const pnl = ts.reduce((s,t)=>s+t.pnl,0);
    return {
      month, label: getMonthLabel(month), pnl, trades: ts.length,
      wins: wins.length, losses: losses.length,
      winRate: ts.length ? Math.round(wins.length/ts.length*100) : 0,
      avgPnl: ts.length ? pnl/ts.length : 0,
      bestTrade: ts.length ? Math.max(...ts.map(t=>t.pnl)) : 0,
      worstTrade: ts.length ? Math.min(...ts.map(t=>t.pnl)) : 0,
    };
  });
}
export function getCumulative(trades: Trade[]) {
  const sorted = [...trades].sort((a,b)=>{
    const da = a.date || "", db = b.date || "";
    const ta = a.time || "", tb = b.time || "";
    return da.localeCompare(db) || ta.localeCompare(tb);
  });
  let cum = 0;
  return sorted.map((t,i)=>({ name:(t.date||"").slice(5), pnl:t.pnl||0, cumulative:(cum+=(t.pnl||0)), idx:i+1, pair:t.pair||"" }));
}
export function getAnalytics(trades: Trade[]) {
  if (!trades.length) return { totalPnl:0,totalTrades:0,winRate:0,avgWin:0,avgLoss:0,profitFactor:0,maxWin:0,maxLoss:0,avgRR:0,longestWinStreak:0,longestLossStreak:0,bestPair:"—",worstPair:"—",totalWins:0,totalLosses:0 };
  const wins = trades.filter(t=>t.pnl>0), losses = trades.filter(t=>t.pnl<0);
  const totalPnl = trades.reduce((s,t)=>s+t.pnl,0);
  const grossWin = wins.reduce((s,t)=>s+t.pnl,0);
  const grossLoss = Math.abs(losses.reduce((s,t)=>s+t.pnl,0));
  let mW=0,mL=0,cW=0,cL=0;
  [...trades].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).forEach(t=>{ if(t.pnl>0){cW++;cL=0;mW=Math.max(mW,cW);}else{cL++;cW=0;mL=Math.max(mL,cL);} });
  const pairPnl: Record<string,number>={};
  trades.forEach(t=>{ pairPnl[t.pair]=(pairPnl[t.pair]||0)+t.pnl; });
  const pe=Object.entries(pairPnl);
  const rrTrades = trades.filter(t=>t.rr>0);
  return {
    totalPnl, totalTrades:trades.length, totalWins:wins.length, totalLosses:losses.length,
    winRate: Math.round(wins.length/trades.length*100),
    avgWin: wins.length ? grossWin/wins.length : 0,
    avgLoss: losses.length ? grossLoss/losses.length : 0,
    profitFactor: grossLoss>0 ? parseFloat((grossWin/grossLoss).toFixed(2)) : grossWin>0 ? 999 : 0,
    maxWin: wins.length ? Math.max(...wins.map(t=>t.pnl)) : 0,
    maxLoss: losses.length ? Math.max(...losses.map(t=>Math.abs(t.pnl))) : 0,
    avgRR: rrTrades.length ? parseFloat((rrTrades.reduce((s,t)=>s+t.rr,0)/rrTrades.length).toFixed(2)) : 0,
    longestWinStreak:mW, longestLossStreak:mL,
    bestPair: pe.length ? [...pe].sort((a,b)=>b[1]-a[1])[0][0] : "—",
    worstPair: pe.length ? [...pe].sort((a,b)=>a[1]-b[1])[0][0] : "—",
  };
}
export function getMistakeFreq(trades: Trade[]) {
  const f: Record<number,number>={};
  trades.forEach(t=>t.mistakes?.forEach(m=>{f[m]=(f[m]||0)+1;}));
  return f;
}
export function getToday() { return new Date().toISOString().split("T")[0]; }
export function getNow() { return new Date().toTimeString().slice(0,5); }
