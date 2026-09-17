"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { UploadCloud, Search, ArrowUpDown, CheckSquare, Square, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/layout/PageHeader";
import { Button, Loading } from "@/components/ui";
import CertificateGallery from "@/components/CertificateGallery";
import CertificateUploadModal from "@/components/CertificateUploadModal";
import { useActiveFirm } from "@/lib/activeFirm";
import { cn } from "@/lib/utils";
import { Certificate } from "@/lib/types";

type Tab = "all" | "evaluation" | "payout";

export default function CertificatesPage() {
  const activeFirm = useActiveFirm();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [firms, setFirms] = useState<string[]>([]);
  const [firmFilter, setFirmFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortOldest, setSortOldest] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Certificates page keeps its own firm filter, independent of the sidebar's
  // global switcher — so you can browse one firm's certs without changing
  // every other page's active firm.
  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/certificates", { cache: "no-store" })
      .then(r => r.json())
      .then(j => setCerts(j.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/propfirms").then(r => r.json()).then(j => { if (j.success) setFirms(j.data); }).catch(() => {});
  }, []);

  // Drop any selected ids that no longer exist (e.g. deleted individually via the lightbox)
  useEffect(() => {
    setSelected(prev => {
      const validIds = new Set(certs.map(c => c._id).filter(Boolean) as string[]);
      const next = new Set(Array.from(prev).filter(id => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [certs]);

  const evalCount = certs.filter(c => c.type === "evaluation").length;
  const payoutCount = certs.filter(c => c.type === "payout").length;

  const filtered = useMemo(() => {
    let rows = tab === "all" ? certs : certs.filter(c => c.type === tab);
    if (firmFilter) rows = rows.filter(c => (c.propFirm || "") === firmFilter);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter(c => (c.label || "").toLowerCase().includes(q) || (c.fileName || "").toLowerCase().includes(q));
    rows = [...rows].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOldest ? ta - tb : tb - ta;
    });
    return rows;
  }, [certs, tab, firmFilter, search, sortOldest]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: certs.length },
    { key: "evaluation", label: "Evaluation", count: evalCount },
    { key: "payout", label: "Payout", count: payoutCount },
  ];

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every(c => c._id && selected.has(c._id));
  const toggleSelectAll = () => {
    if (allSelected) { setSelected(new Set()); return; }
    setSelected(new Set(filtered.map(c => c._id!).filter(Boolean)));
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} certificates delete karein? Ye undo nahi hoga.`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.all(ids.map(id => fetch(`/api/certificates/${id}`, { method: "DELETE" }).then(r => r.ok)));
      const failed = results.filter(ok => !ok).length;
      toast[failed ? "error" : "success"](failed ? `${ids.length - failed}/${ids.length} deleted, ${failed} fail hui` : `${ids.length} certificates deleted ✅`);
      setSelected(new Set());
      load();
    } catch { toast.error("Bulk delete failed"); }
    finally { setBulkDeleting(false); }
  };

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader
        title="Certificates"
        subtitle={firmFilter ? `${firmFilter} ke certificates` : "Apne evaluation pass aur payout certificates yahan save karo"}
      >
        <Button variant="primary" size="md" onClick={() => setShowUpload(true)}>
          <UploadCloud size={16} /> Upload Certificate
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          {tabs.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                tab === t.key
                  ? "bg-gradient-to-r from-purple to-pink text-white border-transparent shadow-glow-purple"
                  : "bg-bg-700 text-ink-300 border-black/[0.06] hover:bg-bg-600 hover:text-ink-100"
              )}>
              {t.label} <span className="opacity-70 font-mono ml-1">{t.count}</span>
            </button>
          ))}
        </div>

        <select className="inp" style={{ width: "auto", minWidth: "140px" }} value={firmFilter} onChange={e => setFirmFilter(e.target.value)}>
          <option value="">All Firms</option>
          {firms.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <div className="relative sm:ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input className="inp" style={{ width: "100%", maxWidth: "220px", paddingLeft: "2.25rem" }}
            placeholder="Naam se search karo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Button variant="ghost" size="md" onClick={() => setSortOldest(s => !s)} title="Sort order">
          <ArrowUpDown size={14} /> {sortOldest ? "Oldest" : "Newest"}
        </Button>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs text-ink-400 hover:text-ink-200 transition-colors">
            {allSelected ? <CheckSquare size={15} className="text-purple" /> : <Square size={15} />}
            Sab select karo
          </button>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-ink-400 font-mono">{selected.size} selected</span>
              <Button variant="danger" size="sm" onClick={bulkDelete} loading={bulkDeleting}>
                <Trash2 size={12} /> Delete
              </Button>
              <button onClick={() => setSelected(new Set())} className="text-ink-400 hover:text-ink-200">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? <Loading /> : (
        <CertificateGallery certs={filtered} selected={selected} onToggleSelect={toggleSelect} onChange={load} />
      )}

      {showUpload && (
        <CertificateUploadModal
          defaultType={tab === "payout" ? "payout" : "evaluation"}
          defaultFirm={firmFilter || activeFirm}
          onClose={() => setShowUpload(false)}
          onUploaded={load}
        />
      )}
    </div>
  );
}
