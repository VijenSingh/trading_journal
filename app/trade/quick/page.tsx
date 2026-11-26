"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Camera, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Button, Label } from "@/components/ui";
import { PAIR_GROUPS, STRATEGIES, ACTIVE_STATUSES } from "@/lib/types";
import { useActiveFirm } from "@/lib/activeFirm";
import { useAccounts } from "@/lib/accounts";
import { tradeWouldBreak } from "@/lib/accountRules";
import { isFuture } from "@/lib/instruments";
import { cn, compressImage, formatCurrency, formatPnl, getNow, getToday } from "@/lib/utils";
import { invalidateTradeData } from "@/lib/useTradeData";

// Phone-first trade entry: the few fields needed now; details can be added later from
// the journal. A screenshot shared to the app ("Share → TraderMind") arrives here.
export default function QuickTradePage() {
  return (
    <Suspense fallback={null}>
      <QuickTrade />
    </Suspense>
  );
}

function QuickTrade() {
  const router = useRouter();
  const params = useSearchParams();
  const activeFirm = useActiveFirm();
  const [firms, setFirms] = useState<string[]>([]);
  const [firm, setFirm] = useState(activeFirm);
  const { accounts } = useAccounts(firm);
  const [playbook, setPlaybook] = useState<string[]>([]);
  const [f, setF] = useState({ pair: "", type: "BUY" as "BUY" | "SELL", lot: "1", gross: "", strategy: "" });
  const [ticked, setTicked] = useState<string[] | null>(null); // null = all active
  const [shot, setShot] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/propfirms").then(r => r.json()).then(j => { if (j.success) setFirms(j.data); }).catch(() => {});
    fetch("/api/playbook").then(r => r.json()).then(j => { if (j.success) setPlaybook(j.data.map((s: { name: string }) => s.name)); }).catch(() => {});
  }, []);
  useEffect(() => { if (!firm && activeFirm) setFirm(activeFirm); }, [activeFirm, firm]);

  // Pick up a screenshot handed over by the service worker's share target.
  useEffect(() => {
    if (params.get("shared") !== "1" || !("caches" in window)) return;
    (async () => {
      const cache = await caches.open("tradermind-share");
      const res = await cache.match("/shared-screenshot");
      if (!res) return;
      const blob = await res.blob();
      await cache.delete("/shared-screenshot");
      setShot(await compressImage(new File([blob], "shared", { type: blob.type || "image/png" })));
      toast.success("Screenshot aa gaya 📸");
    })().catch(() => toast.error("Shared screenshot nahi padh paya"));
  }, [params]);

  const firmAccounts = useMemo(() => accounts.filter(a => a.propFirm === firm && ACTIVE_STATUSES.includes(a.status)), [accounts, firm]);
  const selected = ticked ?? firmAccounts.map(a => a._id);
  const rate = firmAccounts.filter(a => selected.includes(a._id)).reduce((m, a) => Math.max(m, Number(a.commissionPerContract) || 0), 0);
  const lot = parseFloat(f.lot) || 0;
  const gross = parseFloat(f.gross);
  const fees = Math.round(rate * lot * 100) / 100;
  const net = Number.isFinite(gross) ? Math.round((gross - fees) * 100) / 100 : null;

  const pickShot = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setShot(await compressImage(file));
  };

  const save = async () => {
    if (!firm) { toast.error("Prop firm chuno"); return; }
    if (!f.pair) { toast.error("Pair chuno"); return; }
    if (net == null) { toast.error("P&L daalo"); return; }
    const hits = firmAccounts.filter(a => selected.includes(a._id))
      .map(a => { const why = tradeWouldBreak(a.check, a.rules, net); return why ? `• ${a.name}: ${why}` : null; })
      .filter(Boolean);
    if (hits.length && !window.confirm(["🚨 Is trade se rule toot raha hai:", ...hits, "", "Phir bhi save karna hai?"].join("\n"))) return;

    setSaving(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: getToday(), time: getNow(), pair: f.pair, type: f.type, lot, propFirm: firm,
          grossPnl: gross, fees, pnl: net, accounts: selected, strategy: f.strategy, screenshot: shot,
          mistakes: [], tags: ["quick"],
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error);
      invalidateTradeData();
      toast.success("Trade save ✅ — details baad mein Journal se bhar sakte ho");
      setF(x => ({ ...x, gross: "", strategy: "" }));
      setShot("");
      router.replace("/trade/quick");
    } catch (e) { toast.error(e instanceof Error && e.message ? e.message : "Save nahi hua"); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-8 page-transition max-w-lg">
      <PageHeader title="Quick Trade" subtitle="Abhi ke liye zaroori cheezein — baaki baad mein" />
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1"><Label>Prop Firm</Label>
          <select className="inp" value={firm} onChange={e => { setFirm(e.target.value); setTicked(null); }}>
            <option value="">Select firm...</option>
            {firms.map(x => <option key={x}>{x}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1"><Label>Pair</Label>
            <select className="inp" value={f.pair} onChange={e => setF({ ...f, pair: e.target.value })}>
              <option value="">Select...</option>
              {PAIR_GROUPS.map(g => <optgroup key={g.label} label={g.label}>{g.pairs.map(p => <option key={p}>{p}</option>)}</optgroup>)}
            </select>
          </div>
          <div className="flex flex-col gap-1"><Label>{isFuture(f.pair) ? "Contracts" : "Lot"}</Label>
            <input type="number" inputMode="decimal" className="inp" value={f.lot} onChange={e => setF({ ...f, lot: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(["BUY", "SELL"] as const).map(t => (
            <button key={t} type="button" onClick={() => setF({ ...f, type: t })}
              className={cn("py-3 rounded-xl text-sm font-bold border", f.type === t
                ? t === "BUY" ? "bg-green/15 text-green border-green/30" : "bg-red/15 text-red border-red/30"
                : "bg-bg-700 text-ink-400 border-black/[0.06]")}>{t}</button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <Label>P&L ($, ek account ka, fees se pehle)</Label>
          <input type="number" inputMode="decimal" className="inp text-lg font-mono" placeholder="+250 ya -120" value={f.gross}
            onChange={e => setF({ ...f, gross: e.target.value })} />
          {net != null && (
            <span className={cn("text-xs font-mono", net >= 0 ? "text-green" : "text-red")}>
              Net {formatPnl(net)}{fees > 0 ? ` (fees ${formatCurrency(fees)})` : ""}
            </span>
          )}
        </div>

        {firmAccounts.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label>Accounts</Label>
            <div className="flex flex-wrap gap-2">
              {firmAccounts.map(a => {
                const on = selected.includes(a._id);
                return (
                  <button key={a._id} type="button"
                    onClick={() => setTicked(on ? selected.filter(x => x !== a._id) : [...selected, a._id])}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border",
                      on ? "bg-green/10 text-green border-green/30" : "bg-bg-700 text-ink-400 border-black/[0.06]")}>
                    {on ? "✓ " : ""}{a.name}
                    {a.check.room != null && <span className="ml-1 font-mono opacity-70">· {formatCurrency(Math.max(0, a.check.room))}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1"><Label>Strategy (optional)</Label>
          <select className="inp" value={f.strategy} onChange={e => setF({ ...f, strategy: e.target.value })}>
            <option value="">—</option>
            {playbook.length > 0 && <optgroup label="Playbook">{playbook.map(s => <option key={s}>{s}</option>)}</optgroup>}
            <optgroup label="Others">{STRATEGIES.filter(s => !playbook.includes(s)).map(s => <option key={s}>{s}</option>)}</optgroup>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label>Screenshot</Label>
          {shot ? (
            <div className="relative w-fit">
              <img src={shot} alt="screenshot" className="max-h-48 rounded-xl border border-black/[0.06]" />
              <button type="button" onClick={() => setShot("")} className="absolute -top-2 -right-2 bg-red text-white rounded-full p-1"><X size={12} /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-black/[0.15] text-ink-400 cursor-pointer">
              <Camera size={16} /> Photo / screenshot chuno
              <input type="file" accept="image/*" className="hidden" onChange={e => { pickShot(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          )}
          {params.get("share") === "nosw" && <span className="text-[10px] text-amber">Share se image nahi aayi — app ek baar khol kar dobara share karo, ya yahan chuno.</span>}
        </div>

        <Button variant="primary" className="w-full justify-center py-3" loading={saving} onClick={save}>Save Trade</Button>
        <Link href="/trade/new" className="text-center text-xs text-ink-400 underline">Poora form kholo</Link>
      </Card>
    </div>
  );
}
