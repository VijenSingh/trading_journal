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
  const [inline, setInline] = useState<{ screenshots: number; certificates: number } | null>(null);
  const [moving, setMoving] = useState(false);

  const loadInline = useCallback(async () => {
    try {
      const j = await (await fetch("/api/backups/migrate", { cache: "no-store" })).json();
      if (j.success) setInline(j.remaining);
    } catch { /* section just stays hidden */ }
  }, []);

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

  useEffect(() => { load(); loadInline(); }, [load, loadInline]);

  // Moves files still stored in the DB into Blob, one server batch at a time.
  const moveToBlob = async () => {
    setMoving(true);
    const tid = toast.loading("Files shift ho rahi hain…");
    let total = 0;
    try {
      while (true) {
        const res = await fetch("/api/backups/migrate", { method: "POST" });
        const j = await res.json();
        if (!res.ok || !j.success) throw new Error(j.error || "Files shift nahi ho payi");
        total += j.moved;
        setInline(j.remaining);
        const left = j.remaining.screenshots + j.remaining.certificates;
        toast.loading(`Files shift ho rahi hain… ${total} ho gayi, ${left} baaki`, { id: tid });
        if (left === 0 || j.moved === 0) break;
      }
      toast.success(`${total} files Blob mein shift ho gayi ✅`, { id: tid });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Files shift nahi ho payi", { id: tid, duration: 8000 });
    } finally { setMoving(false); }
  };

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => !creating && !moving && onClose()}>
      <div className="bg-bg-800 border border-black/[0.08] rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg font-bold text-ink-100 flex items-center gap-2"><Cloud size={18} /> Cloud Backups</div>
          <button onClick={onClose} disabled={creating || moving} className="text-ink-400 hover:text-ink-100"><X size={16} /></button>
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

        {configured && inline && inline.screenshots + inline.certificates > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-bg-700 border border-black/[0.06]">
            <div className="text-xs text-ink-300 mb-2">
              {inline.screenshots} screenshots aur {inline.certificates} certificate files abhi database mein hain.
              Blob mein shift karne se database chhota aur app tez hogi. (Pehle cloud backup zaroori hai.)
            </div>
            <button onClick={moveToBlob} disabled={moving || creating || backups.length === 0}
              className="w-full py-2 bg-bg-600 text-ink-100 border border-black/[0.08] rounded-lg text-xs font-bold hover:bg-bg-500 disabled:opacity-50">
              {moving ? "Shift ho rahi hain…" : "Blob mein shift karo"}
            </button>
          </div>
        )}

        {configured && (
          <button onClick={createNow} disabled={creating || loading || moving}
            className="w-full mt-4 py-2.5 bg-green/15 text-green border border-green/25 rounded-xl text-sm font-bold hover:bg-green/25 transition-all disabled:opacity-50">
            {creating ? "Backup ban raha hai…" : "Abhi backup lo"}
          </button>
        )}
      </div>
    </div>
  );
}
