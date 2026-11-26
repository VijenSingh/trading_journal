"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Badge, Button, Label, EmptyState, Loading, StatCard } from "@/components/ui";
import { useActiveFirm } from "@/lib/activeFirm";
import { cn, formatPnl, formatCurrency, getToday } from "@/lib/utils";
import { invalidateTradeData } from "@/lib/useTradeData";
import { invalidatePropFirmAccounts } from "@/lib/propfirmAccounts";
import { AccountStats, AccountStatus, ACCOUNT_STATUS_LABELS, ACTIVE_STATUSES } from "@/lib/types";
import { useAccounts, invalidateAccounts } from "@/lib/accounts";

const STATUS_BADGE: Record<AccountStatus, "blue" | "green" | "purple" | "red" | "gray"> = {
  evaluation: "blue", funded: "green", passed: "purple", failed: "red", closed: "gray",
};
const SIZE_PRESETS = [25000, 50000, 100000, 150000];

export default function AccountsPage() {
  const activeFirm = useActiveFirm();
  const { accounts, loading, error } = useAccounts(activeFirm);
  const [showAdd, setShowAdd] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  useEffect(() => { if (error) toast.error(error); }, [error]);

  const active = accounts.filter(a => ACTIVE_STATUSES.includes(a.status));
  const shown = showClosed ? accounts : active;
  const byFirm = useMemo(() => {
    const m: Record<string, AccountStats[]> = {};
    shown.forEach(a => { (m[a.propFirm] ||= []).push(a); });
    return Object.entries(m).sort(([x], [y]) => x.localeCompare(y));
  }, [shown]);
  const totals = accounts.reduce((t, a) => ({ fees: t.fees + a.fees, payouts: t.payouts + a.payouts }), { fees: 0, payouts: 0 });

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Accounts" subtitle={`Har account ka balance, drawdown aur payout${activeFirm ? ` · ${activeFirm}` : ""}`}>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Naya Account</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Accounts" value={String(active.length)} sub={`${accounts.length} total`} />
        <StatCard label="Active Balance" value={formatCurrency(active.reduce((s, a) => s + a.balance, 0))} />
        <StatCard label="Fees / Payouts" value={`${formatCurrency(totals.fees)} / ${formatCurrency(totals.payouts)}`} />
        <StatCard label="Net (Payout − Fee)" value={formatPnl(totals.payouts - totals.fees)} color={totals.payouts - totals.fees >= 0 ? "green" : "red"} />
      </div>

      <div className="flex justify-end mb-3">
        <label className="flex items-center gap-2 text-xs text-ink-400 cursor-pointer">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />
          Passed / failed / closed accounts bhi dikhao
        </label>
      </div>

      {loading ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon="🏦" title={accounts.length ? "Koi active account nahi" : "Abhi koi account nahi"}
          sub="'Naya Account' se apna pehla prop firm account add karo — phir trade form mein usse tick kar sakte ho" />
      ) : byFirm.map(([firm, list]) => (
        <div key={firm} className="mb-6">
          <div className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-2">{firm}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {list.map(a => <AccountCard key={a._id} a={a} />)}
          </div>
        </div>
      ))}

      {showAdd && <AddAccountModal defaultFirm={activeFirm} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AccountCard({ a }: { a: AccountStats }) {
  const [open, setOpen] = useState(false);
  const [txns, setTxns] = useState<{ _id: string; type: string; amount: number; date: string; note: string }[]>([]);
  const [payout, setPayout] = useState<{ type: "payout" | "investment"; amount: string; date: string } | null>(null);
  const ddPct = a.size ? (a.maxDrawdown / a.size) * 100 : 0;

  const loadTxns = useCallback(async () => {
    const j = await (await fetch(`/api/accounts/${a._id}/txns`, { cache: "no-store" })).json();
    if (j.success) setTxns(j.data);
  }, [a._id]);
  useEffect(() => { if (open) loadTxns(); }, [open, loadTxns]);

  const patch = async (body: Record<string, unknown>, okMsg: string) => {
    const res = await fetch(`/api/accounts/${a._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok || !j.success) { toast.error(j.error || "Save nahi hua"); return; }
    toast.success(okMsg);
    invalidateAccounts();
  };

  const changeStatus = (status: AccountStatus) => {
    if (status === a.status) return;
    const date = window.prompt(`${ACCOUNT_STATUS_LABELS[status]} kis date ko hua? (YYYY-MM-DD)`, getToday());
    if (!date) return;
    patch({ status, statusDate: date.trim() }, `Status: ${ACCOUNT_STATUS_LABELS[status]} ✅`);
  };

  const rename = () => {
    const name = window.prompt("Account ka naam:", a.name);
    if (name && name.trim() !== a.name) patch({ name: name.trim() }, "Naam update ho gaya ✅");
  };

  const saveTxn = async () => {
    if (!payout) return;
    const amount = parseFloat(payout.amount);
    if (!(amount > 0)) { toast.error("Amount daalo"); return; }
    const res = await fetch(`/api/accounts/${a._id}/txns`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: payout.type, amount, date: payout.date }),
    });
    const j = await res.json();
    if (!res.ok || !j.success) { toast.error(j.error || "Save nahi hua"); return; }
    toast.success(payout.type === "payout" ? "Payout add ho gaya ✅" : "Fee add ho gayi ✅");
    setPayout(null);
    loadTxns();
    invalidateAccounts();
    invalidatePropFirmAccounts();
  };

  const deleteTxn = async (id: string) => {
    if (!confirm("Ye entry delete karein?")) return;
    const res = await fetch(`/api/propfirm-accounts/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete nahi hua"); return; }
    loadTxns();
    invalidateAccounts();
    invalidatePropFirmAccounts();
  };

  const remove = async () => {
    if (!confirm(`"${a.name}" delete karein? Iski fee/payout entries bhi hat jayengi, trades se ye account hat jayega (trades rahenge).`)) return;
    const res = await fetch(`/api/accounts/${a._id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete nahi hua"); return; }
    toast.success("Account delete ho gaya");
    invalidateAccounts();
    invalidateTradeData();
    invalidatePropFirmAccounts();
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <button onClick={rename} className="text-sm font-bold text-ink-100 hover:underline" title="Naam badlo">{a.name}</button>
          <div className="text-[11px] text-ink-500 font-mono">{formatCurrency(a.size)} · start {a.startDate}{a.lastTradeDate ? ` · last trade ${a.lastTradeDate}` : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[a.status]}>{ACCOUNT_STATUS_LABELS[a.status]}</Badge>
          <select className="inp !py-1 !px-2 !text-xs !w-auto" value={a.status} onChange={e => changeStatus(e.target.value as AccountStatus)} title="Status badlo">
            {(Object.keys(ACCOUNT_STATUS_LABELS) as AccountStatus[]).map(s => <option key={s} value={s}>{ACCOUNT_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Fig label="Balance" value={formatCurrency(a.balance)} sub={formatPnl(a.pnl)} tone={a.pnl >= 0 ? "green" : "red"} />
        <Fig label="Max Drawdown" value={a.maxDrawdown ? `-${formatCurrency(a.maxDrawdown)}` : "$0"} sub={`${ddPct.toFixed(1)}% of size`} tone={a.maxDrawdown ? "red" : undefined} />
        <Fig label="Peak Balance" value={formatCurrency(a.peakBalance)} sub={`${a.trades} trades`} />
        <Fig label="Fees" value={formatCurrency(a.fees)} />
        <Fig label="Payouts" value={formatCurrency(a.payouts)} tone={a.payouts ? "green" : undefined} />
        <Fig label="Net" value={formatPnl(a.net)} tone={a.net >= 0 ? "green" : "red"} />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" onClick={() => setPayout({ type: "payout", amount: "", date: getToday() })}><Plus size={12} /> Payout</Button>
        <Button size="sm" onClick={() => setPayout({ type: "investment", amount: "", date: getToday() })}><Plus size={12} /> Fee / Reset</Button>
        <button onClick={() => setOpen(o => !o)} className="ml-auto text-xs text-ink-400 flex items-center gap-1">
          History {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={remove} className="text-ink-500 hover:text-red" title="Account delete karo"><Trash2 size={13} /></button>
      </div>

      {payout && (
        <div className="flex flex-wrap items-end gap-2 mt-3 p-3 rounded-xl bg-bg-700">
          <div className="flex flex-col gap-1"><Label>{payout.type === "payout" ? "Payout ($)" : "Fee ($)"}</Label>
            <input type="number" className="inp !w-28" value={payout.amount} onChange={e => setPayout({ ...payout, amount: e.target.value })} autoFocus /></div>
          <div className="flex flex-col gap-1"><Label>Date</Label>
            <input type="date" className="inp" value={payout.date} onChange={e => setPayout({ ...payout, date: e.target.value })} /></div>
          <Button size="sm" variant="primary" onClick={saveTxn}>Save</Button>
          <button onClick={() => setPayout(null)} className="text-ink-400"><X size={14} /></button>
        </div>
      )}

      {open && (
        <div className="mt-3 pt-3 border-t border-black/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">Status history</div>
            {a.statusHistory.map((h, i) => (
              <div key={i} className="flex justify-between py-0.5"><span>{ACCOUNT_STATUS_LABELS[h.status]}</span><span className="font-mono text-ink-400">{h.date}</span></div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">Fees & payouts</div>
            {txns.length === 0 ? <div className="text-ink-500">Koi entry nahi</div> : txns.map(t => (
              <div key={t._id} className="flex items-center justify-between py-0.5">
                <span className={t.type === "payout" ? "text-green" : "text-ink-300"}>{t.type === "payout" ? "+" : "-"}{formatCurrency(t.amount)} <span className="text-ink-500">{t.type === "payout" ? "payout" : "fee"}</span></span>
                <span className="flex items-center gap-2 font-mono text-ink-400">{t.date}
                  <button onClick={() => deleteTxn(t._id)} className="hover:text-red"><Trash2 size={11} /></button></span>
              </div>
            ))}
          </div>
          {a.notes && <div className="sm:col-span-2 text-ink-300">{a.notes}</div>}
        </div>
      )}
    </Card>
  );
}

function Fig({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "green" | "red" }) {
  return (
    <div>
      <div className="text-[10px] text-ink-400 uppercase tracking-widest">{label}</div>
      <div className={cn("text-sm font-mono font-bold", tone === "green" ? "text-green" : tone === "red" ? "text-red" : "text-ink-100")}>{value}</div>
      {sub && <div className="text-[10px] text-ink-500 font-mono">{sub}</div>}
    </div>
  );
}

function AddAccountModal({ defaultFirm, onClose }: { defaultFirm: string; onClose: () => void }) {
  const [firms, setFirms] = useState<string[]>([]);
  const [f, setF] = useState({ propFirm: defaultFirm, name: "", size: "50000", startDate: getToday(), fee: "", status: "evaluation" as AccountStatus, notes: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/propfirms").then(r => r.json()).then(j => { if (j.success) setFirms(j.data); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, size: parseFloat(f.size), fee: parseFloat(f.fee) || 0 }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error);
      toast.success("Account add ho gaya ✅");
      invalidateAccounts();
      invalidatePropFirmAccounts();
      onClose();
    } catch (e) { toast.error(e instanceof Error && e.message ? e.message : "Save nahi hua"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => !saving && onClose()}>
      <div className="bg-bg-800 border border-black/[0.08] rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-lg font-bold text-ink-100 mb-4">Naya Account</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1"><Label>Prop Firm</Label>
            <select className="inp" value={f.propFirm} onChange={e => setF({ ...f, propFirm: e.target.value })}>
              <option value="">Select firm...</option>
              {firms.map(x => <option key={x}>{x}</option>)}
            </select></div>
          <div className="col-span-2 flex flex-col gap-1"><Label>Account Name</Label>
            <input className="inp" placeholder="e.g. 50K Flex #1" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div className="flex flex-col gap-1"><Label>Size ($)</Label>
            <input type="number" className="inp" value={f.size} onChange={e => setF({ ...f, size: e.target.value })} />
            <div className="flex gap-1">{SIZE_PRESETS.map(p => (
              <button key={p} type="button" onClick={() => setF({ ...f, size: String(p) })}
                className={cn("text-[10px] px-1.5 py-0.5 rounded border", f.size === String(p) ? "border-green/40 text-green" : "border-black/[0.08] text-ink-400")}>{p / 1000}K</button>
            ))}</div></div>
          <div className="flex flex-col gap-1"><Label>Challenge Fee ($)</Label>
            <input type="number" className="inp" placeholder="0" value={f.fee} onChange={e => setF({ ...f, fee: e.target.value })} /></div>
          <div className="flex flex-col gap-1"><Label>Start Date</Label>
            <input type="date" className="inp" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} /></div>
          <div className="flex flex-col gap-1"><Label>Status</Label>
            <select className="inp" value={f.status} onChange={e => setF({ ...f, status: e.target.value as AccountStatus })}>
              {(Object.keys(ACCOUNT_STATUS_LABELS) as AccountStatus[]).map(s => <option key={s} value={s}>{ACCOUNT_STATUS_LABELS[s]}</option>)}
            </select></div>
          <div className="col-span-2 flex flex-col gap-1"><Label>Notes</Label>
            <input className="inp" placeholder="optional" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="primary" className="flex-1 justify-center" loading={saving} onClick={save}>Add Account</Button>
          <Button className="flex-1 justify-center" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
