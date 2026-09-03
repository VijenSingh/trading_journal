"use client";
import { RowStat, formatPnl, cn } from "@/lib/utils";

const GRID_COLS = "minmax(90px,1.2fr) 90px 70px minmax(80px,2fr) 60px 90px 90px";

export default function PerformanceTable({ rows, labelHeader }: { rows: RowStat[]; labelHeader: string }) {
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.pnl)), 1);

  return (
    <div className="overflow-x-auto -mx-1">
      <div className="min-w-[640px] px-1">
        {/* Header */}
        <div className="grid gap-3 pb-2 mb-1 border-b border-black/[0.06] text-[10px] font-semibold text-ink-400 uppercase tracking-widest"
          style={{ gridTemplateColumns: GRID_COLS }}>
          <div>{labelHeader}</div>
          <div className="text-right">P&L</div>
          <div className="text-right">%</div>
          <div></div>
          <div className="text-right">Days</div>
          <div className="text-right">Best</div>
          <div className="text-right">Worst</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-black/[0.04]">
          {rows.map(r => {
            const isProfit = r.pnl >= 0;
            const barPct = Math.min(100, Math.abs(r.pnl) / maxAbs * 100);
            return (
              <div key={r.key} className="grid gap-3 py-2.5 items-center text-xs"
                style={{ gridTemplateColumns: GRID_COLS }}>
                <div className="font-semibold text-ink-100 truncate">{r.label}</div>
                <div className={cn("text-right font-mono font-semibold", isProfit ? "text-green" : "text-red")}>
                  {r.days === 0 ? "—" : formatPnl(r.pnl)}
                </div>
                <div className={cn("text-right font-mono", isProfit ? "text-green/80" : "text-red/80")}>
                  {r.days === 0 ? "—" : `${r.pct >= 0 ? "" : "-"}${Math.abs(r.pct).toFixed(1)}%`}
                </div>
                <div className="h-2 bg-bg-700 rounded-full overflow-hidden">
                  {r.days > 0 && (
                    <div className="h-full rounded-full" style={{
                      width: `${barPct}%`,
                      background: isProfit ? "rgba(0,230,118,0.7)" : "rgba(255,69,96,0.7)",
                    }} />
                  )}
                </div>
                <div className="text-right font-mono text-ink-400">{r.days || "—"}</div>
                <div className="text-right font-mono text-green/90">{r.days ? formatPnl(r.best) : "—"}</div>
                <div className="text-right font-mono text-red/90">{r.days ? formatPnl(r.worst) : "—"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
