"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, Building2, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useActiveFirm, setActiveFirm } from "@/lib/activeFirm";
import { cn } from "@/lib/utils";

export default function FirmSwitcher() {
  const activeFirm = useActiveFirm();
  const [firms, setFirms] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newFirm, setNewFirm] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const loadFirms = () => {
    fetch("/api/propfirms").then(r => r.json()).then(j => { if (j.success) setFirms(j.data); }).catch(() => {});
  };
  useEffect(loadFirms, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdding(false); }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (firm: string) => {
    setActiveFirm(firm);
    setOpen(false);
  };

  const addFirm = async () => {
    const name = newFirm.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/propfirms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error();
      toast.success(`${name} add ho gaya ✅`);
      setNewFirm("");
      setAdding(false);
      loadFirms();
      setActiveFirm(name);
      setOpen(false);
    } catch { toast.error("Add nahi ho paya"); }
  };

  return (
    <div className="relative px-3 pb-3" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-700 border border-black/[0.06] text-left hover:bg-bg-600 transition-all"
      >
        <Building2 size={14} className="text-purple flex-shrink-0" />
        <span className="flex-1 text-xs font-semibold text-ink-100 truncate">{activeFirm || "All Firms"}</span>
        <ChevronDown size={14} className={cn("text-ink-400 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 mt-1 bg-bg-800 border border-black/[0.08] rounded-xl shadow-card z-50 py-1.5 max-h-64 overflow-y-auto">
          <button type="button" onClick={() => select("")}
            className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-bg-700 transition-colors",
              !activeFirm ? "text-purple font-semibold" : "text-ink-200")}>
            {!activeFirm ? <Check size={12} /> : <span className="w-3" />} All Firms
          </button>
          {firms.map(f => (
            <button key={f} type="button" onClick={() => select(f)}
              className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-bg-700 transition-colors",
                activeFirm === f ? "text-purple font-semibold" : "text-ink-200")}>
              {activeFirm === f ? <Check size={12} /> : <span className="w-3" />} {f}
            </button>
          ))}
          <div className="border-t border-black/[0.06] mt-1 pt-1">
            {adding ? (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <input autoFocus className="inp !py-1.5 !text-xs flex-1" placeholder="Firm ka naam"
                  value={newFirm} onChange={e => setNewFirm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addFirm()} />
                <button type="button" onClick={addFirm} className="text-[11px] text-green font-semibold px-1.5 flex-shrink-0">Add</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green hover:bg-green/5 transition-colors">
                <Plus size={12} /> Naya Firm Add Karo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
