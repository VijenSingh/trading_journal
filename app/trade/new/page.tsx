"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Button, Label, Badge } from "@/components/ui";
import { PAIRS, STRATEGIES, SESSIONS, EMOTIONS, MISTAKES } from "@/lib/types";
import { getToday, getNow, cn } from "@/lib/utils";
import { invalidateTradeData } from "@/lib/useTradeData";
import { Save, X, Calculator, CheckCircle2 } from "lucide-react";

const defaultForm = {
  date: "", time: "", pair: "", customPair: "", type: "BUY" as "BUY" | "SELL",
  lot: "", entry: "", sl: "", target: "", exit: "", pnl: "",
  pips: "", rr: "", strategy: "", session: "", emotion: "",
  reasoning: "", lesson: "", rulesFollowed: "", tags: "",
};

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function NewTradePage() {
  const router = useRouter();
  const [form, setForm] = useState({ ...defaultForm, date: getToday(), time: getNow() });
  const [selectedMistakes, setSelectedMistakes] = useState<number[]>([]);
  const [noMistakes, setNoMistakes] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const calcRR = () => {
    const e = parseFloat(form.entry), s = parseFloat(form.sl), t = parseFloat(form.target);
    if (!e || !s || !t) return;
    const risk = Math.abs(e - s);
    const reward = Math.abs(t - e);
    if (risk > 0) set("rr", (reward / risk).toFixed(2));
  };

  const toggleMistake = (id: number) => {
    if (noMistakes) setNoMistakes(false);
    setSelectedMistakes(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleNoMistakes = () => {
    setNoMistakes(prev => !prev);
    setSelectedMistakes([]);
  };

  const getPair = () => form.pair === "Other" ? form.customPair : form.pair;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pair = getPair();
    if (!pair) { toast.error("Pair select karo"); return; }
    if (!form.pnl) { toast.error("P&L enter karo"); return; }

    setLoading(true);
    try {
      const body = {
        date: form.date || getToday(),
        time: form.time || getNow(),
        pair,
        type: form.type,
        lot: parseFloat(form.lot) || 0,
        entry: parseFloat(form.entry) || 0,
        sl: parseFloat(form.sl) || 0,
        target: parseFloat(form.target) || 0,
        exit: parseFloat(form.exit) || 0,
        pnl: parseFloat(form.pnl) || 0,
        pips: parseFloat(form.pips) || 0,
        rr: parseFloat(form.rr) || 0,
        strategy: form.strategy,
        session: form.session,
        emotion: form.emotion,
        mistakes: noMistakes ? [] : selectedMistakes,
        noMistakesFlag: noMistakes,
        reasoning: form.reasoning,
        lesson: form.lesson,
        rulesFollowed: form.rulesFollowed,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      };

      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed");
      toast.success("Trade save ho gaya! ✅");
      invalidateTradeData();
      setForm({ ...defaultForm, date: getToday(), time: getNow() });
      setSelectedMistakes([]);
      setNoMistakes(false);
      setTimeout(() => router.push("/journal"), 800);
      router.refresh();
    } catch {
      toast.error("Error saving trade. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setForm({ ...defaultForm, date: getToday(), time: getNow() });
    setSelectedMistakes([]);
    setNoMistakes(false);
  };

  return (
    <div className="p-4 md:p-8 page-transition max-w-5xl">
      <PageHeader title="New Trade" subtitle="Har trade ka detail record rakho — yahi consistency banata hai" />

      <form onSubmit={handleSubmit} noValidate>
        {/* Section 1: Basic Info */}
        <Card className="p-6 mb-5">
          <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-green/10 text-green text-[10px] flex items-center justify-center font-mono">1</span>
            Trade Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FormGroup label="Date">
              <input type="date" className="inp" value={form.date} onChange={e => set("date", e.target.value)} />
            </FormGroup>
            <FormGroup label="Time">
              <input type="time" className="inp" value={form.time} onChange={e => set("time", e.target.value)} />
            </FormGroup>
            <FormGroup label="Session">
              <select className="inp" value={form.session} onChange={e => set("session", e.target.value)}>
                <option value="">Select session...</option>
                {SESSIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Pair / Instrument *">
              <select className="inp" value={form.pair} onChange={e => set("pair", e.target.value)}>
                <option value="">Select pair...</option>
                {PAIRS.map(p => <option key={p}>{p}</option>)}
              </select>
            </FormGroup>
            {form.pair === "Other" && (
              <FormGroup label="Custom Pair">
                <input className="inp" placeholder="e.g. USOIL" value={form.customPair} onChange={e => set("customPair", e.target.value)} />
              </FormGroup>
            )}
            <FormGroup label="Trade Type">
              <div className="flex gap-2">
                {(["BUY", "SELL"] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => set("type", t)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                      form.type === t
                        ? t === "BUY" ? "bg-green/15 text-green border-green/30" : "bg-red/15 text-red border-red/30"
                        : "bg-bg-700 text-ink-300 border-white/[0.06] hover:bg-bg-600"
                    )}>
                    {t === "BUY" ? "📈 BUY" : "📉 SELL"}
                  </button>
                ))}
              </div>
            </FormGroup>
            <FormGroup label="Lot Size">
              <input type="number" className="inp" placeholder="e.g. 2.0" step="0.01" min="0"
                value={form.lot} onChange={e => set("lot", e.target.value)} />
            </FormGroup>
          </div>
        </Card>

        {/* Section 2: Price Levels */}
        <Card className="p-6 mb-5">
          <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue/10 text-blue text-[10px] flex items-center justify-center font-mono">2</span>
            Price Levels
            <button type="button" onClick={calcRR}
              className="ml-auto flex items-center gap-1 text-xs text-blue hover:text-blue/80 transition-colors">
              <Calculator size={12} /> Auto-calc RR
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FormGroup label="Entry Price">
              <input type="number" className="inp" placeholder="e.g. 2345.50" step="0.01"
                value={form.entry} onChange={e => set("entry", e.target.value)} onBlur={calcRR} />
            </FormGroup>
            <FormGroup label="Stop Loss 🔴">
              <input type="number" className="inp" placeholder="e.g. 2340.00" step="0.01"
                value={form.sl} onChange={e => set("sl", e.target.value)} onBlur={calcRR} />
            </FormGroup>
            <FormGroup label="Target 🟢">
              <input type="number" className="inp" placeholder="e.g. 2360.00" step="0.01"
                value={form.target} onChange={e => set("target", e.target.value)} onBlur={calcRR} />
            </FormGroup>
            <FormGroup label="Exit Price">
              <input type="number" className="inp" placeholder="e.g. 2355.00" step="0.01"
                value={form.exit} onChange={e => set("exit", e.target.value)} />
            </FormGroup>
            <FormGroup label="Pips (optional)">
              <input type="number" className="inp" placeholder="e.g. 15.5" step="0.1"
                value={form.pips} onChange={e => set("pips", e.target.value)} />
            </FormGroup>
            <FormGroup label="Risk:Reward Ratio">
              <input type="number" className="inp" placeholder="Auto ya manual" step="0.01"
                value={form.rr} onChange={e => set("rr", e.target.value)} />
            </FormGroup>
          </div>
          {form.rr && (
            <div className={cn(
              "mt-4 p-3 rounded-xl text-sm font-mono font-semibold flex items-center gap-2 border",
              parseFloat(form.rr) >= 2 ? "bg-green/8 text-green border-green/20" : "bg-amber/8 text-amber border-amber/20"
            )}>
              {parseFloat(form.rr) >= 2 ? "✅" : "⚠️"} Risk:Reward = 1:{form.rr}
              {parseFloat(form.rr) < 1.5 && " — Low RR! Acha setup nahi lag raha."}
              {parseFloat(form.rr) >= 2 && " — Good RR! 🎯"}
            </div>
          )}
        </Card>

        {/* Section 3: P&L */}
        <Card className="p-6 mb-5">
          <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber/10 text-amber text-[10px] flex items-center justify-center font-mono">3</span>
            P&L & Strategy
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup label="P&L (₹ mein) *">
              <input type="number" className="inp" placeholder="+5000 ya -2000" required
                value={form.pnl} onChange={e => set("pnl", e.target.value)} />
            </FormGroup>
            <FormGroup label="Strategy Used">
              <select className="inp" value={form.strategy} onChange={e => set("strategy", e.target.value)}>
                <option value="">Select strategy...</option>
                {STRATEGIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormGroup>
          </div>
          {form.pnl && (
            <div className={cn(
              "mt-4 p-4 rounded-xl border flex items-center justify-between",
              parseFloat(form.pnl) >= 0 ? "bg-green/8 border-green/20" : "bg-red/8 border-red/20"
            )}>
              <div>
                <div className="text-xs text-ink-400 mb-1">Trade Result</div>
                <div className={`text-2xl font-bold font-mono ${parseFloat(form.pnl) >= 0 ? "text-green" : "text-red"}`}>
                  {parseFloat(form.pnl) >= 0 ? "+₹" : "-₹"}{Math.abs(parseFloat(form.pnl)).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="text-4xl">{parseFloat(form.pnl) >= 0 ? "🎉" : "😤"}</div>
            </div>
          )}
        </Card>

        {/* Section 4: Emotion */}
        <Card className="p-6 mb-5">
          <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple/10 text-purple text-[10px] flex items-center justify-center font-mono">4</span>
            Emotion & Mindset
          </div>
          <FormGroup label="Trade ke waqt emotion kaisa tha?">
            <div className="flex flex-wrap gap-2 mt-1">
              {EMOTIONS.map(em => (
                <button key={em.value} type="button"
                  onClick={() => set("emotion", form.emotion === em.value ? "" : em.value)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm border transition-all",
                    form.emotion === em.value
                      ? "border-current font-semibold"
                      : "bg-bg-700 text-ink-300 border-white/[0.06] hover:bg-bg-600"
                  )}
                  style={form.emotion === em.value ? { color: em.color, background: `${em.color}18`, borderColor: `${em.color}40` } : {}}>
                  {em.label}
                </button>
              ))}
            </div>
          </FormGroup>
        </Card>

        {/* Section 5: Mistakes */}
        <Card className="p-6 mb-5">
          <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red/10 text-red text-[10px] flex items-center justify-center font-mono">5</span>
            Mistakes Ki Gayi? (Honest raho)
          </div>
          <p className="text-xs text-ink-400 mb-4">Jo mistakes ki ho wo select karo. Agar koi nahi ki to sabse neeche green option select karo.</p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {MISTAKES.map(m => {
              const sel = selectedMistakes.includes(m.id);
              return (
                <button key={m.id} type="button"
                  onClick={() => toggleMistake(m.id)}
                  disabled={noMistakes}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                    noMistakes ? "opacity-30 cursor-not-allowed bg-bg-700 border-white/[0.06]" :
                      sel ? "bg-red/8 border-red/30" : "bg-bg-700 border-white/[0.06] hover:bg-bg-600"
                  )}>
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold border transition-all",
                    sel ? "bg-red border-red text-white" : "border-ink-500 text-transparent"
                  )}>{sel ? "✓" : ""}</div>
                  <div>
                    <div className={`text-xs font-semibold ${sel ? "text-red" : "text-ink-200"}`}>{m.name}</div>
                    <div className="text-[10px] text-ink-400 mt-0.5 leading-relaxed">{m.tip.slice(0, 55)}...</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* No mistakes option */}
          <button type="button" onClick={handleNoMistakes}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
              noMistakes
                ? "bg-green/10 border-green/40 shadow-glow"
                : "bg-bg-700 border-dashed border-white/[0.1] hover:border-green/20 hover:bg-green/5"
            )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2",
              noMistakes ? "bg-green border-green" : "border-ink-400"
            )}>
              {noMistakes
                ? <CheckCircle2 size={18} className="text-bg-950" />
                : <CheckCircle2 size={18} className="text-ink-500" />}
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${noMistakes ? "text-green" : "text-ink-200"}`}>
                ✅ Koi Mistake Nahi Ki!
              </div>
              <div className={`text-xs mt-0.5 ${noMistakes ? "text-green/70" : "text-ink-400"}`}>
                {noMistakes
                  ? "Wah! Aaj ek disciplined professional trader ki tarah trade kiya! 🔥"
                  : "Agar aaj sabhi rules follow kiye aur koi mistake nahi hui — ye select karo"}
              </div>
            </div>
            {noMistakes && (
              <div className="ml-auto text-2xl">🏆</div>
            )}
          </button>

          {selectedMistakes.length > 0 && (
            <div className="mt-3 p-3 bg-red/5 border border-red/15 rounded-xl">
              <div className="text-xs text-red font-semibold">
                ⚠️ {selectedMistakes.length} mistake{selectedMistakes.length > 1 ? "s" : ""} hui — next trade mein improve karo!
              </div>
            </div>
          )}
        </Card>

        {/* Section 6: Journal */}
        <Card className="p-6 mb-6">
          <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue/10 text-blue text-[10px] flex items-center justify-center font-mono">6</span>
            Trade Journal
          </div>
          <div className="flex flex-col gap-4">
            <FormGroup label="Trade Ki Reasoning (kyu liya ye trade?)">
              <textarea className="inp" rows={3}
                placeholder="Kya setup tha? Market structure, OB, supply/demand — sab detail mein likho..."
                value={form.reasoning} onChange={e => set("reasoning", e.target.value)} />
            </FormGroup>
            <FormGroup label="Lesson / Learning (kya seekha?)">
              <textarea className="inp" rows={3}
                placeholder="Iss trade se kya seekha? Kya sahi kiya? Kya galat hua? Agle baar kya karoge?"
                value={form.lesson} onChange={e => set("lesson", e.target.value)} />
            </FormGroup>
            <FormGroup label="Rules Follow Kiye?">
              <textarea className="inp" rows={2}
                placeholder="e.g. SL aur target dono set kiye the, lot size fixed rakha..."
                value={form.rulesFollowed} onChange={e => set("rulesFollowed", e.target.value)} />
            </FormGroup>
            <FormGroup label="Tags (comma-separated)">
              <input className="inp" placeholder="e.g. trend, news, london-session"
                value={form.tags} onChange={e => set("tags", e.target.value)} />
            </FormGroup>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="lg" loading={loading} className="min-w-[160px]">
            <Save size={16} /> Trade Save Karo
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={handleClear}>
            <X size={16} /> Clear Form
          </Button>
          <span className="ml-auto text-xs text-ink-400">* = zaroori field</span>
        </div>
      </form>
    </div>
  );
}
