"use client";
import { useState, useEffect } from "react";
import { Card, CardTitle, Button, Label } from "@/components/ui";
import { cn, getToday } from "@/lib/utils";
import { Building2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePropFirmAccounts, invalidatePropFirmAccounts, groupByFirm, overallSummary } from "@/lib/propfirmAccounts";

export default function PropFirmInvestmentCard() {
  const { txns, loading } = usePropFirmAccounts();
  const [firms, setFirms] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ propFirm: "", type: "investment" as "investment" | "payout", amount: "", date: getToday(), note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/propfirms").then(r => r.json()).then(j => { if (j.success) setFirms(j.data); }).catch(() => {});
  }, []);

  const add = async () => {
    const amt = parseFloat(form.amount);
    if (!form.propFirm) { toast.error("Prop firm select karo"); return; }
    if (!amt || amt <= 0) { toast.error("Valid amount enter karo"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/propfirm-accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: amt }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error();
      toast.success(form.type === "investment" ? "Investment add ho gaya ✅" : "Payout add ho gaya ✅");
      setForm(f => ({ ...f, amount: "", note: "" }));
      setShowForm(false);
      invalidatePropFirmAccounts();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Ye entry delete karein?")) return;
    try {
      const res = await fetch(`/api/propfirm-accounts/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error();
      toast.success("Deleted");
      invalidatePropFirmAccounts();
    } catch { toast.error("Delete failed — try again"); }
  };

  const rows = groupByFirm(txns);
  const overall = overallSummary(rows);

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-purple" />
          <CardTitle className="mb-0">Prop Firm Investment & Payout</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(s => !s)}>
          <Plus size={13} /> {showForm ? "Cancel" : "Add Entry"}
        </Button>
      </div>

      {showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4 p-4 bg-bg-700 rounded-xl">
          <div className="flex flex-col gap-1.5">
            <Label>Prop Firm</Label>
            <select className="inp" value={form.propFirm} onChange={e => setForm(f => ({ ...f, propFirm: e.target.value }))}>
              <option value="">Select firm...</option>
              {firms.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <select className="inp" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as "investment" | "payout" }))}>
              <option value="investment">Investment (naya account)</option>
              <option value="payout">Payout (return)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Amount (₹)</Label>
            <input type="number" className="inp" placeholder="e.g. 5000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <input type="date" className="inp" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Note (optional)</Label>
            <input className="inp" placeholder="e.g. 10k Challenge" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="sm:col-span-5">
            <Button variant="primary" size="sm" onClick={add} loading={saving}>Save Entry</Button>
          </div>
        </div>
      )}

      {!loading && rows.length === 0 ? (
        <div className="text-sm text-ink-400 text-center py-6">Abhi koi investment/payout entry nahi — &quot;+ Add Entry&quot; se shuru karo.</div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.05]">
                {["Firm", "Accounts", "Investment", "Payout", "Net", "ROI"].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] font-semibold text-ink-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.firm} className="border-b border-black/[0.03]">
                  <td className="py-3 px-3 font-semibold text-ink-100">{r.firm}</td>
                  <td className="py-3 px-3 font-mono text-ink-300">{r.accounts}</td>
                  <td className="py-3 px-3 font-mono text-ink-300">₹{r.investment.toLocaleString("en-IN")}</td>
                  <td className="py-3 px-3 font-mono text-green">₹{r.payout.toLocaleString("en-IN")}</td>
                  <td className={cn("py-3 px-3 font-mono font-semibold", r.net >= 0 ? "text-green" : "text-red")}>
                    {r.net >= 0 ? "+" : "-"}₹{Math.abs(r.net).toLocaleString("en-IN")}
                  </td>
                  <td className={cn("py-3 px-3 font-mono font-semibold", r.roi === null ? "text-ink-500" : r.roi >= 1 ? "text-green" : "text-amber")}>
                    {r.roi === null ? "—" : `${r.roi.toFixed(1)}x`}
                  </td>
                </tr>
              ))}
              <tr className="bg-bg-700/50">
                <td className="py-3 px-3 font-bold text-ink-100">Overall (Sabhi Firms)</td>
                <td className="py-3 px-3 font-mono font-bold text-ink-100">{overall.accounts}</td>
                <td className="py-3 px-3 font-mono font-bold text-ink-100">₹{overall.investment.toLocaleString("en-IN")}</td>
                <td className="py-3 px-3 font-mono font-bold text-green">₹{overall.payout.toLocaleString("en-IN")}</td>
                <td className={cn("py-3 px-3 font-mono font-bold", overall.net >= 0 ? "text-green" : "text-red")}>
                  {overall.net >= 0 ? "+" : "-"}₹{Math.abs(overall.net).toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-3 font-mono font-bold text-ink-100">
                  {overall.investment > 0 ? `${(overall.payout / overall.investment).toFixed(1)}x` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!loading && txns.length > 0 && (
        <div className="mt-4 pt-4 border-t border-black/[0.05] space-y-1.5 max-h-56 overflow-y-auto">
          {txns.map(t => (
            <div key={t._id} className="flex items-center justify-between p-2.5 bg-bg-700 rounded-lg text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-ink-400">{t.date}</span>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-lg border font-semibold",
                  t.type === "investment" ? "bg-blue/10 text-blue border-blue/20" : "bg-green/10 text-green border-green/20"
                )}>
                  {t.propFirm} · {t.type === "investment" ? "Investment" : "Payout"}
                </span>
                {t.note && <span className="text-ink-400">{t.note}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("font-mono font-semibold", t.type === "investment" ? "text-red" : "text-green")}>
                  {t.type === "investment" ? "-" : "+"}₹{t.amount.toLocaleString("en-IN")}
                </span>
                <button onClick={() => del(t._id)} className="text-ink-500 hover:text-red transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
