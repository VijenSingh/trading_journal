"use client";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Cloud, Download, X } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface CloudBackup { pathname: string; size: number; uploadedAt: string }

// Lists the weekly automatic backups kept in Vercel Blob and can take one now.
export default function CloudBackupsModal({ onClose }: { onClose: () => void }) {
  const [backups, setBackups] = useState<CloudBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backups", { cache: "no-store" });
      const j = await res.json();
      if (j.configured === false) setConfigured(false);
      else if (j.success) setBackups(j.data);
      else toast.error(j.error || "Cloud backups load nahi hue");
    } catch { toast.error("Cloud backups load nahi hue"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNow = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error);
      toast.success(`Cloud backup ban gaya ✅ (${j.trades} trades, ${formatBytes(j.size)})`);
      load();
    } catch (e) { toast.error(e instanceof Error && e.message ? e.message : "Cloud backup fail hua"); }
    finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => !creating && onClose()}>
      <div className="bg-bg-800 border border-black/[0.08] rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg font-bold text-ink-100 flex items-center gap-2"><Cloud size={18} /> Cloud Backups</div>
          <button onClick={onClose} disabled={creating} className="text-ink-400 hover:text-ink-100"><X size={16} /></button>
        </div>
        <p className="text-xs text-ink-400 mb-4">Har Sunday raat (IST) apne aap backup banta hai. Last 8 backups rakhe jaate hain.</p>

        {!configured ? (
          <div className="text-sm text-ink-300 leading-relaxed p-3 rounded-xl bg-amber/10 border border-amber/25">
            Vercel Blob store abhi connect nahi hai. Vercel → Storage → Create → <b>Blob</b> banao aur is project se connect karo,
            phir redeploy karo. Saath mein <b>CRON_SECRET</b> env variable bhi set karo taaki weekly backup chale.
          </div>
        ) : loading ? (
          <div className="text-sm text-ink-400 py-6 text-center">Load ho raha hai…</div>
        ) : backups.length === 0 ? (
          <div className="text-sm text-ink-400 py-6 text-center">Abhi koi cloud backup nahi hai</div>
        ) : (
          <ul className="divide-y divide-black/[0.05] max-h-72 overflow-y-auto">
            {backups.map(b => (
              <li key={b.pathname} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm text-ink-100 font-mono">
                    {new Date(b.uploadedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-[11px] text-ink-500">{formatBytes(b.size)}</div>
                </div>
                <a href={`/api/backups?download=${encodeURIComponent(b.pathname)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-700 text-ink-300 border border-black/[0.06] rounded-lg text-xs font-semibold hover:bg-bg-600">
                  <Download size={12} /> Download
                </a>
              </li>
            ))}
          </ul>
        )}

        {configured && (
          <button onClick={createNow} disabled={creating || loading}
            className="w-full mt-4 py-2.5 bg-green/15 text-green border border-green/25 rounded-xl text-sm font-bold hover:bg-green/25 transition-all disabled:opacity-50">
            {creating ? "Backup ban raha hai…" : "Abhi backup lo"}
          </button>
        )}
      </div>
    </div>
  );
}
