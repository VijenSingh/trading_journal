"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardTitle, Label } from "@/components/ui";
import { PAIRS, PIP_VALUES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Calculator as CalcIcon } from "lucide-react";

export default function CalculatorPage() {
  const [balance, setBalance] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [pair, setPair] = useState("XAUUSD (Gold)");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");

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

  const bal = parseFloat(balance) || 0;
  const risk = parseFloat(riskPct) || 0;
  const e = parseFloat(entry) || 0;
  const s = parseFloat(sl) || 0;
  const distance = Math.abs(e - s);
  const riskAmount = bal * (risk / 100);
  const pipVal = PIP_VALUES[pair] ?? 100;

  let lot = 0;
  if (distance > 0 && riskAmount > 0) {
    if (pair === "XAUUSD (Gold)") {
      lot = riskAmount / (distance * pipVal);
    } else if (["NASDAQ", "US30", "SP500", "BTCUSD", "ETHUSD"].includes(pair)) {
      lot = riskAmount / distance;
    } else {
      const isJPY = pair.includes("JPY");
      const pips = isJPY ? distance * 100 : distance * 10000;
      lot = riskAmount / (pips * pipVal);
    }
  }

  const canCalc = bal > 0 && risk > 0 && e > 0 && s > 0 && distance > 0;

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
            <Label>Account Balance (₹)</Label>
            <input type="number" className="inp" placeholder="e.g. 100000" value={balance} onChange={e => setBalance(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Risk % Per Trade</Label>
            <input type="number" className="inp" placeholder="e.g. 1" step="0.1" value={riskPct} onChange={e => setRiskPct(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Pair / Instrument</Label>
            <select className="inp" value={pair} onChange={e => setPair(e.target.value)}>
              {PAIRS.filter(p => p !== "Other").map(p => <option key={p}>{p}</option>)}
            </select>
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
                <div className="text-xs text-ink-400">Suggested Lot Size</div>
                <div className="text-3xl font-bold font-mono text-green">{lot.toFixed(2)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
              <div>
                <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">Risk Amount</div>
                <div className="text-sm font-mono font-semibold text-red">-₹{riskAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">SL Distance</div>
                <div className="text-sm font-mono font-semibold text-ink-100">{distance.toFixed(2)}</div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>Reward at Different R:R</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {rewardTargets.map(r => (
                <div key={r.rr} className={cn(
                  "p-3 rounded-xl border text-center",
                  r.rr >= 2 ? "bg-green/5 border-green/20" : "bg-bg-700 border-white/[0.06]"
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
