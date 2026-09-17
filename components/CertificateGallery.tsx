"use client";
import { useState, useEffect } from "react";
import { Download, Trash2, FileText, X, Pencil, Check, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState } from "@/components/ui";
import { cn, downloadDataUrl } from "@/lib/utils";
import { Certificate } from "@/lib/types";

interface Props {
  certs: Certificate[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onChange: () => void;
}

export default function CertificateGallery({ certs, selected, onToggleSelect, onChange }: Props) {
  const [viewing, setViewing] = useState<Certificate | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");

  // Lock body scroll while the lightbox is open
  useEffect(() => {
    if (viewing) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [viewing]);

  // Reset label-edit state whenever a different certificate is opened
  useEffect(() => {
    setEditingLabel(false);
    setLabelDraft(viewing?.label || "");
  }, [viewing]);

  const viewingIndex = viewing ? certs.findIndex(c => c._id === viewing._id) : -1;
  const goNext = () => { if (certs.length > 1 && viewingIndex >= 0) setViewing(certs[(viewingIndex + 1) % certs.length]); };
  const goPrev = () => { if (certs.length > 1 && viewingIndex >= 0) setViewing(certs[(viewingIndex - 1 + certs.length) % certs.length]); };

  // Esc closes the lightbox, Left/Right arrows navigate (unless the label field is being edited)
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (editingLabel) {
        if (e.key === "Escape") setEditingLabel(false);
        return;
      }
      if (e.key === "Escape") setViewing(null);
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, editingLabel, certs]);

  const handleDelete = async (id: string) => {
    if (!confirm("Ye certificate delete karein?")) return;
    try {
      const res = await fetch(`/api/certificates/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error();
      toast.success("Certificate delete ho gaya");
      setViewing(null);
      onChange();
    } catch {
      toast.error("Delete nahi ho paya");
    }
  };

  const handleRename = async () => {
    if (!viewing) return;
    const trimmed = labelDraft.trim();
    try {
      const res = await fetch(`/api/certificates/${viewing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error();
      setViewing(v => (v ? { ...v, label: trimmed } : v));
      setEditingLabel(false);
      toast.success("Naam update ho gaya");
      onChange();
    } catch {
      toast.error("Update nahi ho paya");
    }
  };

  if (certs.length === 0) {
    return <EmptyState icon="🏆" title="Koi certificate nahi mila" sub="Upload button se apna pehla certificate add karo, ya filters check karo" />;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {certs.map(cert => {
          const isImage = cert.mimeType.startsWith("image/");
          const isSelected = !!cert._id && selected.has(cert._id);
          return (
            <button key={cert._id} type="button" onClick={() => setViewing(cert)}
              className={cn(
                "group relative rounded-xl overflow-hidden border bg-bg-700 aspect-[4/3] text-left cursor-pointer",
                isSelected ? "border-purple ring-2 ring-purple/30" : "border-black/[0.06]"
              )}>
              {isImage ? (
                <img src={cert.fileData} alt={cert.label || cert.fileName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-ink-400">
                  <FileText size={26} />
                  <span className="text-[10px] font-mono">PDF</span>
                </div>
              )}
              <span className={cn(
                "absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white",
                cert.type === "evaluation" ? "bg-purple/90" : "bg-green/90"
              )}>
                {cert.type === "evaluation" ? "Eval" : "Payout"}
              </span>
              <span
                role="checkbox"
                aria-checked={isSelected}
                onClick={e => { e.stopPropagation(); if (cert._id) onToggleSelect(cert._id); }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-bg-950/70 flex items-center justify-center hover:bg-bg-950 transition-all"
              >
                {isSelected ? <CheckSquare size={14} className="text-purple" /> : <Square size={14} className="text-white/80" />}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6">
                <div className="text-[10px] text-white truncate font-medium">{cert.label || cert.fileName || "Certificate"}</div>
                {cert.createdAt && (
                  <div className="text-[9px] text-white/60 font-mono">{new Date(cert.createdAt).toLocaleDateString()}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Lightbox: click a certificate to view it bigger, with Download ── */}
      {viewing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setViewing(null)} />

          {certs.length > 1 && (
            <>
              <button type="button" onClick={goPrev} title="Pichla (←)"
                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-bg-800/80 text-ink-100 hover:bg-bg-800 border border-black/[0.08] transition-all z-10">
                <ChevronLeft size={20} />
              </button>
              <button type="button" onClick={goNext} title="Agla (→)"
                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-bg-800/80 text-ink-100 hover:bg-bg-800 border border-black/[0.08] transition-all z-10">
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="relative w-full max-w-2xl max-h-[90vh] bg-bg-800 border border-black/[0.08] rounded-2xl shadow-card flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/[0.06]">
              <div className="min-w-0 flex-1">
                {editingLabel ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={labelDraft}
                      onChange={e => setLabelDraft(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleRename()}
                      placeholder="Certificate ka naam"
                      className="inp !py-1.5 !text-sm flex-1"
                    />
                    <button type="button" onClick={handleRename}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-green/10 text-green hover:bg-green/20 flex-shrink-0 transition-all">
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="text-sm font-semibold text-ink-100 truncate">{viewing.label || viewing.fileName || "Certificate"}</div>
                    <button type="button" onClick={() => setEditingLabel(true)} title="Naam edit karo"
                      className="text-ink-400 hover:text-ink-100 flex-shrink-0 transition-colors">
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
                {viewing.createdAt && !editingLabel && (
                  <div className="text-[11px] text-ink-400 font-mono">{new Date(viewing.createdAt).toLocaleDateString()}</div>
                )}
              </div>
              <button type="button" onClick={() => setViewing(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-700 text-ink-300 hover:bg-bg-600 flex-shrink-0 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-bg-950 flex items-center justify-center min-h-[300px]">
              {viewing.mimeType.startsWith("image/") ? (
                <img src={viewing.fileData} alt={viewing.label || viewing.fileName} className="max-w-full max-h-[65vh] object-contain" />
              ) : (
                <iframe src={viewing.fileData} title={viewing.label || viewing.fileName} className="w-full h-[65vh]" />
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-black/[0.06]">
              {certs.length > 1 && (
                <div className="flex items-center gap-1 sm:hidden">
                  <button type="button" onClick={goPrev} className="w-7 h-7 flex items-center justify-center rounded-lg bg-bg-700 text-ink-300 hover:bg-bg-600 transition-all">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] text-ink-400 font-mono px-1">{viewingIndex + 1}/{certs.length}</span>
                  <button type="button" onClick={goNext} className="w-7 h-7 flex items-center justify-center rounded-lg bg-bg-700 text-ink-300 hover:bg-bg-600 transition-all">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
              <Button type="button" variant="primary" size="sm"
                onClick={() => downloadDataUrl(viewing.fileData, viewing.fileName || `${viewing.type}-certificate`)}>
                <Download size={14} /> Download
              </Button>
              <Button type="button" variant="danger" size="sm" className="ml-auto" onClick={() => handleDelete(viewing._id!)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
