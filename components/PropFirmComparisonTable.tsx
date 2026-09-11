"use client";
import { useEffect, useState, useCallback } from "react";
import { Trade } from "@/lib/types";
import { formatPnl, cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui";
import { usePropFirmAccounts, groupByFirm } from "@/lib/propfirmAccounts";

const GRID_COLS = "minmax(100px,1.3fr) 70px 80px minmax(90px,1fr) 70px 100px 100px 90px";

interface FirmRow {
  firm: string; trades: number; winRate: number; pnl: number; avgRR: number;
  investment: number; payout: number; roi: number | null;
}

export default function PropFirmComparisonTable() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const { txns } = usePropFirmAccounts();

  const load = useCallback(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then(r => r.json())
      .then(j => setTrades(j.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("trade-data-changed", load);
    return () => window.removeEventListener("trade-data-changed", load);
  }, [load]);

  if (loading) return null;

  const accountRows = groupByFirm(txns);
  const accountByFirm = new Map(accountRows.map(r => [r.firm, r]));

  const tradeByFirm: Record<string, { trades: number; wins: number; pnl: number; rrSum: number; rrCount: number }> = {};
  trades.forEach(t => {
    const firm = t.propFirm || "Unknown";
    if (!tradeByFirm[firm]) tradeByFirm[firm] = { trades: 0, wins: 0, pnl: 0, rrSum: 0, rrCount: 0 };
    const b = tradeByFirm[firm];
    b.trades++;
    b.pnl += Number(t.pnl) || 0;
    if ((Number(t.pnl) || 0) > 0) b.wins++;
    if (Number(t.rr) > 0) { b.rrSum += Number(t.rr); b.rrCount++; }
  });

  const firms = new Set([...Object.keys(tradeByFirm), ...accountRows.map(r => r.firm)]);
  const rows: FirmRow[] = Array.from(firms).map(firm => {
    const t = tradeByFirm[firm];
    const a = accountByFirm.get(firm);
    return {
      firm,
      trades: t?.trades || 0,
      winRate: t && t.trades ? Math.round((t.wins / t.trades) * 100) : 0,
      pnl: t?.pnl || 0,
      avgRR: t && t.rrCount ? t.rrSum / t.rrCount : 0,
      investment: a?.investment || 0,
      payout: a?.payout || 0,
      roi: a?.roi ?? null,
    };
  }).sort((a, b) => b.pnl - a.pnl);

  if (rows.length === 0) return null;

  return (
    <Card className="p-5 mb-6">
      <CardTitle>Prop Firm Comparison</CardTitle>
      <div className="overflow-x-auto -mx-1">
        <div className="min-w-[720px] px-1">
          <div className="grid gap-3 pb-2 mb-1 border-b border-black/[0.06] text-[10px] font-semibold text-ink-400 uppercase tracking-widest"
            style={{ gridTemplateColumns: GRID_COLS }}>
            <div>Firm</div>
            <div className="text-right">Trades</div>
            <div className="text-right">Win %</div>
            <div className="text-right">Trade P&L</div>
            <div className="text-right">Avg R:R</div>
            <div className="text-right">Invested</div>
            <div className="text-right">Payout</div>
            <div className="text-right">ROI</div>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {rows.map(r => (
              <div key={r.firm} className="grid gap-3 py-2.5 items-center text-xs" style={{ gridTemplateColumns: GRID_COLS }}>
                <div className="font-semibold text-ink-100 truncate">{r.firm}</div>
                <div className="text-right font-mono text-ink-300">{r.trades || "—"}</div>
                <div className={cn("text-right font-mono", r.trades ? (r.winRate >= 50 ? "text-green" : "text-red") : "text-ink-400")}>
                  {r.trades ? `${r.winRate}%` : "—"}
                </div>
                <div className={cn("text-right font-mono font-semibold", r.trades ? (r.pnl >= 0 ? "text-green" : "text-red") : "text-ink-400")}>
                  {r.trades ? formatPnl(r.pnl) : "—"}
                </div>
                <div className="text-right font-mono text-ink-300">{r.avgRR ? r.avgRR.toFixed(2) : "—"}</div>
                <div className="text-right font-mono text-ink-300">{r.investment ? `₹${r.investment.toLocaleString("en-IN")}` : "—"}</div>
                <div className="text-right font-mono text-green/90">{r.payout ? `₹${r.payout.toLocaleString("en-IN")}` : "—"}</div>
                <div className={cn("text-right font-mono font-semibold", r.roi != null && r.roi >= 1 ? "text-green" : "text-ink-400")}>
                  {r.roi != null ? `${r.roi.toFixed(1)}x` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
