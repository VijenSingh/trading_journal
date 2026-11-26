import type { AccountStats, PropAccount } from "@/lib/types";

interface TradeRow { date: string; time?: string; pnl: number; accounts?: string[] }
interface TxnRow { accountId?: string; type: "investment" | "payout"; amount: number; date: string }

// Balance, drawdown, fees and payouts per account. Pure, so it is unit-tested directly.
//  - balance     = size + Σ trade P&L − Σ payouts
//  - maxDrawdown = largest fall from a running peak of cumulative trade P&L (payouts are
//                  withdrawals, not losses, so they never count as drawdown)
//  - peakBalance = highest balance reached at any point
export function computeAccountStats(accounts: PropAccount[], trades: TradeRow[], txns: TxnRow[]): AccountStats[] {
  return accounts.map(a => {
    const id = String(a._id);
    type Ev = { date: string; time: string; kind: "trade" | "payout"; amount: number };
    const events: Ev[] = [];
    for (const t of trades) {
      if (t.accounts?.includes(id)) events.push({ date: t.date, time: t.time || "", kind: "trade", amount: Number(t.pnl) || 0 });
    }
    let fees = 0;
    for (const x of txns) {
      if (x.accountId !== id) continue;
      if (x.type === "investment") fees += x.amount;
      // a payout lands after that day's trades
      else events.push({ date: x.date, time: "99:99", kind: "payout", amount: x.amount });
    }
    events.sort((p, q) => p.date.localeCompare(q.date) || p.time.localeCompare(q.time));

    let cum = 0, peakCum = 0, maxDD = 0, paid = 0, tradesN = 0, lastTradeDate = "";
    let peakBalance = a.size;
    for (const e of events) {
      if (e.kind === "trade") {
        cum += e.amount; tradesN++; lastTradeDate = e.date;
        peakCum = Math.max(peakCum, cum);
        maxDD = Math.max(maxDD, peakCum - cum);
      } else {
        paid += e.amount;
      }
      peakBalance = Math.max(peakBalance, a.size + cum - paid);
    }
    const r2 = (v: number) => Math.round(v * 100) / 100;
    return {
      ...a,
      _id: id,
      trades: tradesN,
      pnl: r2(cum),
      payouts: r2(paid),
      fees: r2(fees),
      balance: r2(a.size + cum - paid),
      peakBalance: r2(peakBalance),
      maxDrawdown: r2(maxDD),
      lastTradeDate,
      net: r2(paid - fees),
    };
  });
}
