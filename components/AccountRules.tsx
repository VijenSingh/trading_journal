"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Label } from "@/components/ui";
import { cn, formatCurrency, formatPnl } from "@/lib/utils";
import { AccountRules, EMPTY_RULES, RuleCheck } from "@/lib/accountRules";
import type { AccountStats } from "@/lib/types";

const barTone = (pct: number) => (pct >= 100 ? "bg-red" : pct >= 80 ? "bg-amber" : "bg-green");

export function Meter({ label, pct, left, right }: { label: string; pct: number; left: string; right: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex justify-between text-[10px] text-ink-400 mb-0.5">
        <span className="uppercase tracking-widest">{label}</span><span className="font-mono">{right}</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-600 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barTone(pct))} style={{ width: `${w}%` }} />
      </div>
      <div className="text-[10px] text-ink-500 font-mono mt-0.5">{left}</div>
    </div>
  );
}

export function hasRules(r?: AccountRules) {
  return !!r && (r.drawdownType === "eod_trailing" || r.dailyLossLimit > 0 || r.profitTarget > 0 || r.consistencyPct > 0);
}

// Meters for every rule set on the account.
export function RuleMeters({ a }: { a: AccountStats }) {
  const r = { ...EMPTY_RULES, ...(a.rules || {}) };
  const c: RuleCheck = a.check;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {r.drawdownType === "eod_trailing" && c.room != null && (
        <Meter label="Drawdown (EOD trailing)" pct={c.ddUsedPct ?? 0}
          right={c.ddBreachedOn ? `breached ${c.ddBreachedOn}` : `${formatCurrency(c.room)} room`}
          left={`floor ${formatCurrency(c.floor ?? 0)}${r.lockAt != null && (c.floor ?? 0) >= r.lockAt ? " (locked)" : ""} · equity ${formatCurrency(c.equity)}`} />
      )}
      {r.dailyLossLimit > 0 && c.dailyRoom != null && (
        <Meter label="Aaj ka loss" pct={c.dailyUsedPct ?? 0}
          right={`${formatCurrency(Math.max(0, c.dailyRoom))} bacha`}
          left={`aaj ${formatPnl(c.todayPnl)} / limit ${formatCurrency(r.dailyLossLimit)}${c.dailyBreaches.length ? ` · ${c.dailyBreaches.length} din limit hit` : ""}`} />
      )}
      {r.profitTarget > 0 && c.targetProgressPct != null && (
        <div>
          <div className="flex justify-between text-[10px] text-ink-400 mb-0.5">
            <span className="uppercase tracking-widest">Profit target</span>
            <span className="font-mono">{c.targetRemaining ? `${formatCurrency(c.targetRemaining)} baaki` : "✅ hit"}</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-600 overflow-hidden">
            <div className="h-full rounded-full bg-blue" style={{ width: `${Math.max(0, Math.min(100, c.targetProgressPct))}%` }} />
          </div>
          <div className="text-[10px] text-ink-500 font-mono mt-0.5">{c.targetProgressPct.toFixed(0)}% of {formatCurrency(r.profitTarget)}</div>
        </div>
      )}
      {r.consistencyPct > 0 && (
        <div className="text-[11px]">
          <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-0.5">Consistency ({r.consistencyPct}%)</div>
          {c.consistencyOk == null ? <span className="text-ink-500">Abhi koi profit day nahi</span> : (
            <span className={c.consistencyOk ? "text-green" : "text-amber"}>
              Best day {formatCurrency(c.bestDayPnl)} = {c.bestDaySharePct != null ? `${c.bestDaySharePct.toFixed(0)}%` : "—"} of profit
              {!c.consistencyOk && c.consistencyProfitNeeded != null && ` · total ${formatCurrency(c.consistencyProfitNeeded)} chahiye`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function RulesModal({ a, onClose, onSaved }: { a: AccountStats; onClose: () => void; onSaved: () => void }) {
  const r = { ...EMPTY_RULES, ...(a.rules || {}) };
  const [f, setF] = useState({
    drawdownType: r.drawdownType,
    maxDrawdown: r.maxDrawdown ? String(r.maxDrawdown) : "",
    lockAt: r.lockAt != null ? String(r.lockAt) : (r.drawdownType === "none" ? String(a.size) : ""),
    dailyLossLimit: r.dailyLossLimit ? String(r.dailyLossLimit) : "",
    profitTarget: r.profitTarget ? String(r.profitTarget) : "",
    consistencyPct: r.consistencyPct ? String(r.consistencyPct) : "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${a._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: f }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error);
      toast.success("Rules save ho gaye ✅");
      onSaved();
      onClose();
    } catch (e) { toast.error(e instanceof Error && e.message ? e.message : "Save nahi hua"); }
    finally { setSaving(false); }
  };

  const num = (k: keyof typeof f, label: string, placeholder: string, hint?: string) => (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <input type="number" className="inp" placeholder={placeholder} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />
      {hint && <span className="text-[10px] text-ink-500">{hint}</span>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => !saving && onClose()}>
      <div className="bg-bg-800 border border-black/[0.08] rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-lg font-bold text-ink-100">Rules — {a.name}</div>
        <p className="text-xs text-ink-400 mb-4">Firm ki website se apne account ke rules daalo. Khaali chhodo = rule check nahi hoga.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label>Drawdown</Label>
            <select className="inp" value={f.drawdownType} onChange={e => setF({ ...f, drawdownType: e.target.value as AccountRules["drawdownType"] })}>
              <option value="none">Track mat karo</option>
              <option value="eod_trailing">EOD trailing</option>
            </select>
          </div>
          {f.drawdownType === "eod_trailing" && <>
            {num("maxDrawdown", "Max drawdown ($)", "e.g. 2000", "Din ke end ke highest balance se itna neeche tak")}
            {num("lockAt", "Floor lock at ($)", String(a.size), "Floor yahan tak pahunch kar trail karna band. Khaali = kabhi nahi")}
          </>}
          {num("dailyLossLimit", "Daily loss limit ($)", "e.g. 1000")}
          {num("profitTarget", "Profit target ($)", "e.g. 3000", "Evaluation pass ke liye")}
          {num("consistencyPct", "Consistency (%)", "e.g. 50", "Best day ≤ total profit ka itna %")}
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="primary" className="flex-1 justify-center" loading={saving} onClick={save}>Save Rules</Button>
          <Button className="flex-1 justify-center" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
