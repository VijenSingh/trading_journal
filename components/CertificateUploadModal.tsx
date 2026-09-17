"use client";
import { useState, useEffect } from "react";
import { UploadCloud, X, FileText, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { cn, fileToDataUrl, compressImage } from "@/lib/utils";

const MAX_SIZE_MB = 8;
const ACCEPT = "image/*,application/pdf";

interface Props {
  defaultType: "evaluation" | "payout";
  defaultFirm: string;
  onClose: () => void;
  onUploaded: () => void;
}

export default function CertificateUploadModal({ defaultType, defaultFirm, onClose, onUploaded }: Props) {
  const [type, setType] = useState<"evaluation" | "payout">(defaultType);
  const [propFirm, setPropFirm] = useState(defaultFirm);
  const [firms, setFirms] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    fetch("/api/propfirms").then(r => r.json()).then(j => { if (j.success) setFirms(j.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const valid: File[] = [];
    for (const f of incoming) {
      const isAllowed = f.type.startsWith("image/") || f.type === "application/pdf";
      if (!isAllowed) { toast.error(`${f.name}: sirf image ya PDF allowed`); continue; }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`${f.name}: ${MAX_SIZE_MB}MB se badi hai`); continue; }
      valid.push(f);
    }
    if (valid.length) setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const uploadOne = async (file: File) => {
    // Images get compressed (like trade screenshots) so certificates don't bloat the DB;
    // higher quality/size than screenshots since certificate text needs to stay legible.
    const isImage = file.type.startsWith("image/");
    const fileData = isImage ? await compressImage(file, 1600, 0.85) : await fileToDataUrl(file);
    const mimeType = isImage ? "image/jpeg" : file.type;
    const res = await fetch("/api/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, propFirm, label: label.trim(), fileName: file.name, mimeType, fileData }),
    });
    const j = await res.json();
    if (!res.ok || !j.success) throw new Error(j.error || "Failed");
  };

  const submit = async () => {
    if (files.length === 0) { toast.error("Pehle file choose karo"); return; }
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    let failed = 0;
    for (const file of files) {
      try {
        await uploadOne(file);
      } catch {
        failed++;
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }
    setBusy(false);
    const okCount = files.length - failed;
    if (okCount > 0) {
      toast[failed ? "error" : "success"](
        failed ? `${okCount}/${files.length} upload hue, ${failed} fail` : `${okCount} certificate${okCount > 1 ? "s" : ""} upload ho gaye! ✅`
      );
      onUploaded();
      onClose();
    } else {
      toast.error("Upload nahi ho paya");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-md bg-bg-800 border border-black/[0.08] rounded-2xl shadow-card flex flex-col overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/[0.06]">
          <div className="text-sm font-semibold text-ink-100">Certificate Upload Karo</div>
          <button type="button" onClick={onClose} disabled={busy}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-700 text-ink-300 hover:bg-bg-600 transition-all disabled:opacity-50">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-widest mb-2 block">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType("evaluation")}
                className={cn("flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                  type === "evaluation" ? "bg-purple/15 text-purple border-purple/30" : "bg-bg-700 text-ink-300 border-black/[0.06] hover:bg-bg-600")}>
                Evaluation Pass
              </button>
              <button type="button" onClick={() => setType("payout")}
                className={cn("flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                  type === "payout" ? "bg-green/15 text-green border-green/30" : "bg-bg-700 text-ink-300 border-black/[0.06] hover:bg-bg-600")}>
                Payout
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-widest mb-2 block">Prop Firm</label>
            <select value={propFirm} onChange={e => setPropFirm(e.target.value)} className="inp w-full">
              <option value="">General (koi firm nahi)</option>
              {firms.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-widest mb-2 block">Label (optional)</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Jaise: Lucid Trading 50K"
              className="inp w-full" />
            {files.length > 1 && (
              <p className="text-[10px] text-ink-500 mt-1">Sabhi {files.length} files pe ye same label lagega</p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-widest mb-2 block">
              File{files.length > 1 ? "s" : ""}
            </label>

            {files.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {files.map((f, idx) => (
                  <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-bg-700 border border-black/[0.06]">
                    <div className="flex items-center gap-2 min-w-0">
                      {f.type.startsWith("image/") ? <ImageIcon size={13} className="text-ink-400 flex-shrink-0" /> : <FileText size={13} className="text-ink-400 flex-shrink-0" />}
                      <span className="text-xs text-ink-200 truncate">{f.name}</span>
                    </div>
                    <button type="button" onClick={() => removeFile(idx)} disabled={busy}
                      className="text-[11px] text-red font-semibold flex-shrink-0 disabled:opacity-50">Remove</button>
                  </div>
                ))}
              </div>
            )}

            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                dragOver ? "border-purple/50 bg-purple/10" : "border-black/[0.1] hover:border-purple/30 hover:bg-purple/5"
              )}>
              <UploadCloud size={22} className="text-ink-400" />
              <span className="text-xs text-ink-400 text-center">
                {files.length > 0 ? "Aur files add karo" : "Image ya PDF choose karo"} ya yahan drag-drop karo
              </span>
              <span className="text-[10px] text-ink-500">Max {MAX_SIZE_MB}MB har file, multiple select ho sakti hain</span>
              <input type="file" accept={ACCEPT} multiple className="hidden"
                onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-black/[0.06]">
          <Button type="button" variant="primary" size="sm" loading={busy} disabled={files.length === 0} onClick={submit} className="flex-1">
            <UploadCloud size={14} />
            {busy ? `Uploading ${progress.done}/${progress.total}...` : `Upload${files.length > 1 ? ` (${files.length})` : ""}`}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
