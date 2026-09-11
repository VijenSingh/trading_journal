"use client";
import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Loading } from "@/components/ui";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import toast from "react-hot-toast";

interface Rule { _id: string; category: "pre" | "during" | "post" | "emergency"; text: string; order: number }

const CATEGORIES: { key: Rule["category"]; title: string; emoji: string; color: "green" | "amber" | "blue" | "red"; prefix: string }[] = [
  { key: "pre", title: "Pre-Trade Rules — Trade Lene Se Pehle", emoji: "🔴", color: "green", prefix: "RULE" },
  { key: "during", title: "During Trade — Trade Ke Waqt", emoji: "🟡", color: "amber", prefix: "RULE" },
  { key: "post", title: "Post-Trade Rules — Trade Ke Baad", emoji: "🔵", color: "blue", prefix: "RULE" },
  { key: "emergency", title: "Emergency Rules — Jab Sab Galat Ho Raha Ho", emoji: "🚨", color: "red", prefix: "E" },
];

const colorClasses = {
  green: { border: "border-green/40 bg-green/5", text: "text-green" },
  amber: { border: "border-amber/40 bg-amber/5", text: "text-amber" },
  blue: { border: "border-blue/40 bg-blue/5", text: "text-blue" },
  red: { border: "border-red/40 bg-red/5", text: "text-red" },
};

function RuleRow({ rule, num, color, onSave, onDelete }: {
  rule: Rule; num: string; color: "green" | "amber" | "blue" | "red";
  onSave: (id: string, text: string) => Promise<void>; onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(rule.text);
  const [saving, setSaving] = useState(false);
  const c = colorClasses[color];

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try { await onSave(rule._id, text.trim()); setEditing(false); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className={`p-4 rounded-xl border-l-4 ${c.border} rounded-l-none`}>
        <div className={`text-[10px] font-mono font-bold mb-1.5 ${c.text}`}>{num}</div>
        <textarea className="inp text-sm w-full" rows={2} value={text} onChange={e => setText(e.target.value)} autoFocus />
        <div className="flex gap-2 mt-2">
          <button onClick={save} disabled={saving} className="flex items-center gap-1 text-[11px] text-green hover:text-green/80 font-semibold disabled:opacity-50">
            <Check size={12} /> Save
          </button>
          <button onClick={() => { setText(rule.text); setEditing(false); }} className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-ink-200">
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group p-4 rounded-xl border-l-4 ${c.border} rounded-l-none relative`}>
      <div className={`text-[10px] font-mono font-bold mb-1.5 ${c.text}`}>{num}</div>
      <div className="text-sm text-ink-100 leading-relaxed font-medium pr-14">{rule.text}</div>
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-bg-800/80 text-ink-400 hover:text-ink-100">
          <Pencil size={11} />
        </button>
        <button onClick={() => onDelete(rule._id)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-bg-800/80 text-ink-400 hover:text-red">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

function AddRuleRow({ category, onAdd }: { category: Rule["category"]; onAdd: (category: Rule["category"], text: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try { await onAdd(category, text.trim()); setText(""); setAdding(false); }
    finally { setSaving(false); }
  };

  if (!adding) {
    return (
      <button onClick={() => setAdding(true)}
        className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-black/[0.1] text-ink-400 text-sm hover:border-black/20 hover:text-ink-200 transition-all">
        <Plus size={14} /> Naya Rule Add Karo
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl border-2 border-dashed border-black/[0.1]">
      <textarea className="inp text-sm w-full" rows={2} placeholder="Apna rule likho..." value={text} onChange={e => setText(e.target.value)} autoFocus />
      <div className="flex gap-2 mt-2">
        <button onClick={submit} disabled={saving} className="flex items-center gap-1 text-[11px] text-green hover:text-green/80 font-semibold disabled:opacity-50">
          <Check size={12} /> Add
        </button>
        <button onClick={() => { setText(""); setAdding(false); }} className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-ink-200">
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/rules", { cache: "no-store" })
      .then(r => r.json())
      .then(j => { if (j.success) setRules(j.data); })
      .catch(() => toast.error("Rules load nahi hui"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveRule = async (id: string, text: string) => {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error();
      setRules(prev => prev.map(r => (r._id === id ? { ...r, text } : r)));
      toast.success("Rule update ho gaya");
    } catch { toast.error("Update failed"); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Ye rule delete karein?")) return;
    try {
      const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error();
      setRules(prev => prev.filter(r => r._id !== id));
      toast.success("Rule deleted");
    } catch { toast.error("Delete failed"); }
  };

  const addRule = async (category: Rule["category"], text: string) => {
    try {
      const res = await fetch("/api/rules", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, text }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error();
      setRules(prev => [...prev, j.data]);
      toast.success("Rule add ho gaya");
    } catch { toast.error("Add failed"); }
  };

  if (loading) return <div className="p-4 md:p-8"><Loading /></div>;

  return (
    <div className="p-4 md:p-8 page-transition max-w-4xl">
      <PageHeader title="Trading Rules" subtitle="Apne rules likho, edit karo — jo tum follow karoge wahi kaam aayega" />

      <Card className="p-6 mb-6 border-green/20 bg-green/5">
        <div className="text-sm text-green font-semibold mb-2">⚡ Ek Baat Yaad Rakho</div>
        <p className="text-sm text-ink-200 leading-relaxed">
          Rules woh nahi hote jo sirf likhe hon — rules woh hote hain jo har trade mein follow kiye jayein.
          Ek professional trader ka sabse bada weapon uski discipline hai, uska setup nahi.
        </p>
      </Card>

      {CATEGORIES.map(cat => {
        const catRules = rules.filter(r => r.category === cat.key).sort((a, b) => a.order - b.order);
        return (
          <div key={cat.key} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{cat.emoji}</span>
              <h2 className="text-sm font-semibold text-ink-200 uppercase tracking-widest">{cat.title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catRules.map((r, i) => (
                <RuleRow key={r._id} rule={r} num={`${cat.prefix} ${cat.key === "emergency" ? i + 1 : String(i + 1).padStart(2, "0")}`}
                  color={cat.color} onSave={saveRule} onDelete={deleteRule} />
              ))}
              <AddRuleRow category={cat.key} onAdd={addRule} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
