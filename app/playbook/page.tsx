"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Pencil, X, ImagePlus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Button, Label, EmptyState, Loading } from "@/components/ui";
import { useActiveFirm } from "@/lib/activeFirm";
import { cn, formatPnl, formatR, compressImage } from "@/lib/utils";
import { invalidateTradeData } from "@/lib/useTradeData";
import { MAX_SETUP_IMAGES, PlaybookSetup, Slice } from "@/lib/playbook";

export default function PlaybookPage() {
  const firm = useActiveFirm();
  const [setups, setSetups] = useState<PlaybookSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = firm ? `?propFirm=${encodeURIComponent(firm)}` : "";
      const j = await (await fetch(`/api/playbook${q}`, { cache: "no-store" })).json();
      if (j.success) setSetups(j.data); else toast.error(j.error || "Playbook load nahi hua");
    } catch { toast.error("Playbook load nahi hua"); }
    finally { setLoading(false); }
  }, [firm]);
  useEffect(() => { load(); }, [load]);

  const remove = async (s: PlaybookSetup) => {
    if (!confirm(`"${s.name}" setup delete karein? Uske trades rahenge (strategy naam ke saath).`)) return;
    const res = await fetch(`/api/playbook/${s._id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete nahi hua"); return; }
    toast.success("Setup delete ho gaya");
    window.dispatchEvent(new CustomEvent("playbook-changed"));
    load();
  };

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Playbook" subtitle={`Apne setups, unki checklist aur kaunsa setup sach mein kamata hai${firm ? ` · ${firm}` : ""}`}>
        <Button variant="primary" size="sm" onClick={() => setEditing("new")}><Plus size={13} /> Naya Setup</Button>
      </PageHeader>

      {loading ? <Loading /> : setups.length === 0 ? (
        <EmptyState icon="📘" title="Abhi koi setup nahi"
          sub="Apna pehla setup banao — naam, entry rules ki checklist aur example charts. Phir trade form mein Strategy mein wahi chuno." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {setups.map(s => (
            <Card key={s._id} className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="text-base font-bold text-ink-100">{s.name}</div>
                  {s.description && <div className="text-xs text-ink-400 mt-0.5 whitespace-pre-line">{s.description}</div>}
                </div>
                <div className="flex gap-2 text-ink-400">
                  <button onClick={() => setEditing(s._id)} title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => remove(s)} title="Delete" className="hover:text-red"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center my-3">
                <Fig label="Trades" value={String(s.stats.trades)} />
                <Fig label="Win %" value={`${s.stats.winRate}%`} />
                <Fig label="Net P&L" value={formatPnl(s.stats.pnl)} tone={s.stats.pnl >= 0 ? "green" : "red"} />
                <Fig label="Avg R" value={formatR(s.stats.avgR)} tone={s.stats.avgR == null ? undefined : s.stats.avgR >= 0 ? "green" : "red"} />
              </div>

              {(s.stats.aPlus.trades > 0 || s.stats.partial.trades > 0) && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Compare title="A+ (saare rules)" sl={s.stats.aPlus} good />
                  <Compare title="Rules chhoote" sl={s.stats.partial} />
                </div>
              )}

              {s.checklist.length > 0 && (
                <ul className="text-xs text-ink-300 space-y-1 mb-3">
                  {s.checklist.map((c, i) => <li key={i} className="flex gap-2"><span className="text-green">✓</span>{c}</li>)}
                </ul>
              )}

              {s.imageCount > 0 && (
                <div className="flex gap-2">
                  {Array.from({ length: s.imageCount }, (_, i) => {
                    const url = `/api/playbook/${s._id}/image/${i}?v=${encodeURIComponent(s.updatedAt)}`;
                    return <img key={i} src={url} alt={`${s.name} example ${i + 1}`} loading="lazy" onClick={() => window.open(url, "_blank")}
                      className="h-20 rounded-lg border border-black/[0.06] cursor-zoom-in object-cover" />;
                  })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {editing && <SetupEditor id={editing === "new" ? null : editing} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); invalidateTradeData(); window.dispatchEvent(new CustomEvent("playbook-changed")); }} />}
    </div>
  );
}

function Fig({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div>
      <div className="text-[10px] text-ink-400 uppercase tracking-widest">{label}</div>
      <div className={cn("text-sm font-mono font-bold", tone === "green" ? "text-green" : tone === "red" ? "text-red" : "text-ink-100")}>{value}</div>
    </div>
  );
}

function Compare({ title, sl, good }: { title: string; sl: Slice; good?: boolean }) {
  return (
    <div className={cn("p-2.5 rounded-lg border text-[11px]", good ? "bg-green/5 border-green/15" : "bg-amber/5 border-amber/15")}>
      <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">{title}</div>
      {sl.trades === 0 ? <div className="text-ink-500">Abhi koi trade nahi</div> : (
        <div className="font-mono text-ink-200">
          {sl.trades} trades · {sl.winRate}% · <span className={sl.avgPnl >= 0 ? "text-green" : "text-red"}>{formatPnl(sl.avgPnl)}</span>/trade
          {sl.avgR != null && <> · {formatR(sl.avgR)}</>}
        </div>
      )}
    </div>
  );
}

function SetupEditor({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", description: "", checklist: "" });
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/playbook/${id}`, { cache: "no-store" }).then(r => r.json()).then(j => {
      if (!j.success) { toast.error("Setup load nahi hua"); return; }
      setF({ name: j.data.name, description: j.data.description || "", checklist: (j.data.checklist || []).join("\n") });
      setImages(j.data.images || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_SETUP_IMAGES - images.length;
    const picked = Array.from(files).filter(x => x.type.startsWith("image/")).slice(0, room);
    if (!picked.length) { toast.error(room ? "Sirf image" : `Max ${MAX_SETUP_IMAGES} images`); return; }
    const urls = await Promise.all(picked.map(x => compressImage(x)));
    setImages(i => [...i, ...urls]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { name: f.name, description: f.description, checklist: f.checklist.split("\n"), images };
      const res = await fetch(id ? `/api/playbook/${id}` : "/api/playbook", {
        method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error);
      toast.success(j.movedTrades ? `Setup save ✅ — ${j.movedTrades} trades naye naam par` : "Setup save ho gaya ✅");
      onSaved();
    } catch (e) { toast.error(e instanceof Error && e.message ? e.message : "Save nahi hua"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => !saving && onClose()}>
      <div className="bg-bg-800 border border-black/[0.08] rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="text-lg font-bold text-ink-100 mb-4">{id ? "Setup edit karo" : "Naya Setup"}</div>
        {loading ? <Loading /> : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1"><Label>Naam</Label>
              <input className="inp" placeholder="e.g. Order Block Retest" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
            <div className="flex flex-col gap-1"><Label>Description</Label>
              <textarea className="inp min-h-[70px]" placeholder="Setup kya hai, kab lena hai, kab nahi" value={f.description}
                onChange={e => setF({ ...f, description: e.target.value })} /></div>
            <div className="flex flex-col gap-1"><Label>Checklist (har line ek rule)</Label>
              <textarea className="inp min-h-[110px] font-mono text-xs" placeholder={"HTF trend same direction\nOB untouched\nSL OB ke neeche\nMin 1:2 RR"}
                value={f.checklist} onChange={e => setF({ ...f, checklist: e.target.value })} /></div>
            <div className="flex flex-col gap-1">
              <Label>Example charts (max {MAX_SETUP_IMAGES})</Label>
              <div className="flex gap-2 flex-wrap">
                {images.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`example ${i + 1}`} className="h-20 rounded-lg border border-black/[0.06]" />
                    <button type="button" onClick={() => setImages(im => im.filter((_, k) => k !== i))}
                      className="absolute -top-2 -right-2 bg-red text-white rounded-full p-0.5"><X size={10} /></button>
                  </div>
                ))}
                {images.length < MAX_SETUP_IMAGES && (
                  <label className="h-20 w-24 rounded-lg border border-dashed border-black/[0.15] flex items-center justify-center cursor-pointer text-ink-400 hover:text-ink-100">
                    <ImagePlus size={18} />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <Button variant="primary" className="flex-1 justify-center" loading={saving} disabled={loading} onClick={save}>Save</Button>
          <Button className="flex-1 justify-center" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
