"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardTitle, Label, Button } from "@/components/ui";
import { PAIRS, PAIR_GROUPS } from "@/lib/types";
import { getInstrument, calcPositionSize } from "@/lib/instruments";
import { cn } from "@/lib/utils";
import { useActiveFirm } from "@/lib/activeFirm";
import { useTradeData } from "@/lib/useTradeData";
import { Calculator as CalcIcon, Wallet, Send } from "lucide-react";

export default function CalculatorPage() {
  const [balance, setBalance] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [pair, setPair] = useState("XAUUSD (Gold)");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [customPairs, setCustomPairs] = useState<string[]>([]);
  const activeFirm = useActiveFirm();
  const { trades } = useTradeData();

  useEffect(() => {
    fetch("/api/pairs").then(r => r.json()).then(j => { if (j.success) setCustomPairs(j.data); }).catch(() => {});
  }, []);

  // Remember balance/risk between visits — pure convenience, not sensitive.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tm-calc-balance");
      const savedRisk = localStorage.getItem("tm-calc-risk");
      if (saved) setBalance(saved);
      if (savedRisk) setRiskPct(savedRisk);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (balance) localStorage.setItem("tm-calc-balance", balance);
      if (riskPct) localStorage.setItem("tm-calc-risk", riskPct);
    } catch {}
  }, [balance, riskPct]);

  // Real tracked account balance (deposits - withdrawals + trade P&L) — lets the user
  // one-click fill it instead of retyping it every time.
  useEffect(() => {
    const params = activeFirm ? `?propFirm=${encodeURIComponent(activeFirm)}` : "";
    fetch(`/api/balance${params}`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => {
        if (!j.success) return;
        const txns: { type: string; amount: number }[] = j.data || [];
        const deposits = txns.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
        const withdrawals = txns.filter(t => t.type === "withdrawal").reduce((s, t) => s + t.amount, 0);
        const totalPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
        setAccountBalance(deposits - withdrawals + totalPnl);
      })
      .catch(() => {});
  }, [activeFirm, trades]);

  const bal = parseFloat(balance) || 0;
  const risk = parseFloat(riskPct) || 0;
  const e = parseFloat(entry) || 0;
  const s = parseFloat(sl) || 0;
  const distance = Math.abs(e - s);
  const riskAmount = bal * (risk / 100);
  const spec = getInstrument(pair);
  const lot = calcPositionSize(pair, riskAmount, distance) ?? 0;
  const sizeLabel = spec?.kind === "future" ? "Contracts" : "Lot Size";
  const lotText = spec?.kind === "future" ? String(lot) : lot.toFixed(2);

  const canCalc = !!spec && bal > 0 && risk > 0 && e > 0 && s > 0 && distance > 0;

  const rewardTargets = [1, 1.5, 2, 3].map(rr => ({
    rr,
    reward: riskAmount * rr,
    target: e > s ? e + distance * rr : e - distance * rr, // assumes BUY if entry>sl, SELL otherwise
  }));

  return (
    <div className="p-4 md:p-8 page-transition max-w-3xl">
      <PageHeader title="Position Size Calculator" subtitle="Trade lene se pehle lot size fix karo — risk se calculate karo, feeling se nahi" />

      <Card className="p-5 md:p-6 mb-5">
        <CardTitle>Inputs</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Account Balance (₹)</Label>
              {accountBalance != null && (
                <button type="button" onClick={() => setBalance(String(Math.round(accountBalance)))}
                  className="flex items-center gap-1 text-[10px] text-blue hover:text-blue/80 transition-colors">
                  <Wallet size={10} /> Use ₹{accountBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </button>
              )}
            </div>
            <input type="number" className="inp" placeholder="e.g. 100000" value={balance} onChange={e => setBalance(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Risk % Per Trade</Label>
            <input type="number" className="inp" placeholder="e.g. 1" step="0.1" value={riskPct} onChange={e => setRiskPct(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Pair / Instrument</Label>
            <select className="inp" value={pair} onChange={e => setPair(e.target.value)}>
              {PAIR_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.pairs.map(p => <option key={p}>{p}</option>)}
                </optgroup>
              ))}
              {customPairs.some(p => !PAIRS.includes(p)) && (
                <optgroup label="Custom (size calculate nahi hoga)">
                  {customPairs.filter(p => !PAIRS.includes(p)).map(p => <option key={p}>{p}</option>)}
                </optgroup>
              )}
            </select>
            <span className="text-[10px] text-ink-500">{spec?.note ?? "Is pair ka contract size pata nahi — size calculate nahi ho sakta"}</span>
          </div>
          <div />
          <div className="flex flex-col gap-1.5">
            <Label>Entry Price</Label>
            <input type="number" className="inp" placeholder="e.g. 4700.00" step="0.01" value={entry} onChange={e => setEntry(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Stop Loss Price</Label>
            <input type="number" className="inp" placeholder="e.g. 4690.00" step="0.01" value={sl} onChange={e => setSl(e.target.value)} />
          </div>
        </div>
      </Card>

      {canCalc ? (
        <>
          <Card className="p-6 mb-5 border-green/20 bg-green/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center">
                <CalcIcon size={18} className="text-green" />
              </div>
              <div>
                <div className="text-xs text-ink-400">Suggested {sizeLabel}</div>
                <div className={cn("text-3xl font-bold font-mono", lot > 0 ? "text-green" : "text-red")}>{lotText}</div>
                {lot === 0 && (
                  <div className="text-[11px] text-red mt-1">
                    Itne risk mein 1 {spec?.kind === "future" ? "contract" : "0.01 lot"} bhi fit nahi hota — SL chhota karo ya micro contract lo
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/[0.05]">
              <div>
                <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">Risk Amount</div>
                <div className="text-sm font-mono font-semibold text-red">-₹{riskAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">SL Distance</div>
                <div className="text-sm font-mono font-semibold text-ink-100">{distance.toFixed(2)}</div>
              </div>
            </div>
            <Link href={`/trade/new?pair=${encodeURIComponent(pair)}&entry=${entry}&sl=${sl}&lot=${lotText}`} className="block mt-4">
              <Button variant="primary" size="sm" className="w-full justify-center">
                <Send size={13} /> Use This Setup — New Trade Mein Bhejo
              </Button>
            </Link>
          </Card>

          <Card className="p-5">
            <CardTitle>Reward at Different R:R</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {rewardTargets.map(r => (
                <div key={r.rr} className={cn(
                  "p-3 rounded-xl border text-center",
                  r.rr >= 2 ? "bg-green/5 border-green/20" : "bg-bg-700 border-black/[0.06]"
                )}>
                  <div className="text-[10px] text-ink-400 mb-1">1:{r.rr}</div>
                  <div className="text-sm font-mono font-bold text-green">+₹{r.reward.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  <div className="text-[10px] text-ink-500 font-mono mt-1">@ {r.target.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center text-sm text-ink-400">
          Balance, risk %, entry aur SL fill karo — lot size yahan calculate hoga
        </Card>
      )}
    </div>
  );
}
