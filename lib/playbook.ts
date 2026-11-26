import { rMultiple } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export const MAX_SETUP_IMAGES = 3;

export interface Slice { trades: number; winRate: number; pnl: number; avgPnl: number; avgR: number | null }
export interface SetupStats extends Slice {
  aPlus: Slice;    // trades where every checklist rule was ticked
  partial: Slice;  // trades where some were skipped
}
export interface PlaybookSetup {
  _id: string;
  name: string;
  description: string;
  checklist: string[];
  imageCount: number;
  updatedAt: string;
  stats: SetupStats;
}

function slice(ts: Trade[]): Slice {
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const pnl = ts.reduce((a, t) => a + (Number(t.pnl) || 0), 0);
  const rs = ts.map(rMultiple).filter((r): r is number => r != null);
  return {
    trades: ts.length,
    winRate: ts.length ? Math.round((ts.filter(t => (Number(t.pnl) || 0) > 0).length / ts.length) * 100) : 0,
    pnl: r2(pnl),
    avgPnl: ts.length ? r2(pnl / ts.length) : 0,
    avgR: rs.length ? r2(rs.reduce((a, b) => a + b, 0) / rs.length) : null,
  };
}

// Stats for one setup from the trades tagged with it (trade.strategy === setup name).
export function setupStats(trades: Trade[]): SetupStats {
  const checked = trades.filter(t => t.setupChecks && t.setupChecks.total > 0);
  return {
    ...slice(trades),
    aPlus: slice(checked.filter(t => t.setupChecks!.done === t.setupChecks!.total)),
    partial: slice(checked.filter(t => t.setupChecks!.done < t.setupChecks!.total)),
  };
}
