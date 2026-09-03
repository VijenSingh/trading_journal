"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, Button, Label } from "@/components/ui";
import { PAIRS, STRATEGIES, SESSIONS, EMOTIONS, MISTAKES, PIP_VALUES, Trade } from "@/lib/types";
import { getToday, getNow, cn, compressImage } from "@/lib/utils";
import { invalidateTradeData } from "@/lib/useTradeData";
import { Save, X, Zap, PenLine, CheckCircle2, ImagePlus, Trash2 } from "lucide-react";

const defaultForm = {
  date: "", time: "", pair: "", customPair: "", type: "BUY" as "BUY" | "SELL",
  lot: "", entry: "", sl: "", target: "", exit: "", pnl: "",
  pips: "", rr: "", strategy: "", session: "", emotion: "",
  reasoning: "", lesson: "", rulesFollowed: "", tags: "",
};

function FormGroup({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function tradeToForm(t: Trade) {
  const knownPair = PAIRS.includes(t.pair);
  return {
    date: t.date || "", time: t.time || "",
    pair: knownPair ? t.pair : "Other", customPair: knownPair ? "" : t.pair,
    type: t.type || "BUY",
    lot: t.lot ? String(t.lot) : "", entry: t.entry ? String(t.entry) : "",
    sl: t.sl ? String(t.sl) : "", target: t.target ? String(t.target) : "",
    exit: t.exit ? String(t.exit) : "", pnl: t.pnl != null ? String(t.pnl) : "",
    pips: t.pips ? String(t.pips) : "", rr: t.rr ? String(t.rr) : "",
    strategy: t.strategy || "", session: t.session || "", emotion: t.emotion || "",
    reasoning: t.reasoning || "", lesson: t.lesson || "", rulesFollowed: t.rulesFollowed || "",
    tags: (t.tags || []).join(", "),
  };
}

export default function TradeForm({ tradeId, initialTrade }: { tradeId?: string; initialTrade?: Trade }) {
  const router = useRouter();
  const isEdit = !!tradeId;
  const [form, setForm] = useState(
    initialTrade ? tradeToForm(initialTrade) : { ...defaultForm, date: getToday(), time: getNow() }
  );
  const [selectedMistakes, setSelectedMistakes] = useState<number[]>(initialTrade?.mistakes || []);
  const [noMistakes, setNoMistakes] = useState(!!initialTrade?.noMistakesFlag);
  const [loading, setLoading] = useState(false);
  // In edit mode, keep the saved P&L as-is until entry/exit/lot are actually changed.
  const [pnlManualOverride, setPnlManualOverride] = useState(isEdit);
  const [pnlAutoCalc, setPnlAutoCalc] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [screenshot, setScreenshot] = useState(initialTrade?.screenshot || "");
  const [compressing, setCompressing] = useState(false);

  const handleScreenshot = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Sirf image files allowed"); return; }
    setCompressing(true);
    try {
      const dataUrl = await compressImage(file);
      setScreenshot(dataUrl);
    } catch { toast.error("Image process nahi ho payi"); }
    finally { setCompressing(false); }
  };

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: "" }));
  };

  // ── Auto-calculate P&L whenever entry/exit/lot/pair/type change ──
  useEffect(() => {
    const entry = parseFloat(form.entry);
    const exit = parseFloat(form.exit);
    const lot = parseFloat(form.lot);
    const pair = form.pair === "Other" ? form.customPair : form.pair;

    if (!entry || !exit || !lot || !pair) {
      setPnlAutoCalc(null);
      return;
    }

    // Price difference per unit
    const diff = form.type === "BUY" ? (exit - entry) : (entry - exit);
    const pipVal = PIP_VALUES[pair] ?? 100;

    let autoP: number;
    if (pair === "XAUUSD (Gold)") {
      // Gold uses a special pip scale but still follows the pip value table.
      autoP = diff * pipVal * lot;
    } else if (["NASDAQ", "US30", "SP500"].includes(pair)) {
      // Indices: diff × lot × 1
      autoP = diff * lot;
    } else if (["BTCUSD", "ETHUSD"].includes(pair)) {
      autoP = diff * lot;
    } else {
      // Forex: pips × pip_value × lot
      const isJPY = pair.includes("JPY");
      const pipsActual = isJPY ? Math.abs(diff) * 100 : Math.abs(diff) * 10000;
      autoP = (diff >= 0 ? 1 : -1) * pipsActual * pipVal * lot;
    }

    autoP = parseFloat(autoP.toFixed(2));
    setPnlAutoCalc(autoP);

    // Only set form pnl if user hasn't manually overridden
    if (!pnlManualOverride) {
      setForm(f => ({ ...f, pnl: String(autoP) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.entry, form.exit, form.lot, form.pair, form.customPair, form.type, pnlManualOverride]);

  // ── Auto-calc RR ──
  useEffect(() => {
    const e = parseFloat(form.entry), s = parseFloat(form.sl), t = parseFloat(form.target);
    if (!e || !s || !t) return;
    const risk = Math.abs(e - s);
    const reward = Math.abs(t - e);
    if (risk > 0) setForm(f => ({ ...f, rr: (reward / risk).toFixed(2) }));
  }, [form.entry, form.sl, form.target]);

  const handlePnlManualEdit = (v: string) => {
    setPnlManualOverride(true);
    set("pnl", v);
  };

  const resetPnlToAuto = () => {
    setPnlManualOverride(false);
    if (pnlAutoCalc !== null) setForm(f => ({ ...f, pnl: String(pnlAutoCalc) }));
  };

  const getPair = () => form.pair === "Other" ? form.customPair : form.pair;

  // ── Validation ──
  const validate = () => {
    const e: Record<string, string> = {};
    if (!getPair()) e.pair = "Pair select karo";
    if (!form.session) e.session = "Session select karo";
    if (!form.lot || parseFloat(form.lot) <= 0) e.lot = "Lot size enter karo";
    if (!form.entry || parseFloat(form.entry) <= 0) e.entry = "Entry price enter karo";
    if (!form.exit || parseFloat(form.exit) <= 0) e.exit = "Exit price enter karo";
    if (!form.pnl) e.pnl = "P&L enter karo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Zaroori fields fill karo ⚠️");
      // Scroll to first error
      const firstErr = document.querySelector('.border-red\\/60');
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    try {
      const body = {
        date: form.date || getToday(),
        time: form.time || getNow(),
        pair: getPair(),
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
        screenshot,
      };

      const res = await fetch(isEdit ? `/api/trades/${tradeId}` : "/api/trades", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || "Failed");

      toast.success(isEdit ? "Trade update ho gaya! ✅" : "Trade save ho gaya! ✅");
      invalidateTradeData();

      if (isEdit) {
        setTimeout(() => router.push("/journal"), 500);
      } else {
        setForm({ ...defaultForm, date: getToday(), time: getNow() });
        setSelectedMistakes([]);
        setNoMistakes(false);
        setPnlManualOverride(false);
        setPnlAutoCalc(null);
        setErrors({});
        setScreenshot("");
        setTimeout(() => router.push("/journal"), 800);
      }
      router.refresh();
    } catch {
      toast.error(isEdit ? "Error updating trade. Try again." : "Error saving trade. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setForm({ ...defaultForm, date: getToday(), time: getNow() });
    setSelectedMistakes([]);
    setNoMistakes(false);
    setPnlManualOverride(false);
    setPnlAutoCalc(null);
    setErrors({});
    setScreenshot("");
  };

  const toggleMistake = (id: number) => {
    if (noMistakes) setNoMistakes(false);
    setSelectedMistakes(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const pnlVal = parseFloat(form.pnl) || 0;
  const isProfit = pnlVal > 0;

  const inp = (hasErr: boolean) => cn("inp", hasErr && "border-red/60 focus:border-red/80 focus:shadow-[0_0_0_3px_rgba(255,69,96,0.1)]");

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Section 1: Trade Details ── */}
      <Card className="p-5 md:p-6 mb-5">
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
          <FormGroup label="Session" required>
            <select className={inp(!!errors.session)} value={form.session} onChange={e => set("session", e.target.value)}>
              <option value="">Select session...</option>
              {SESSIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            {errors.session && <span className="text-[11px] text-red">{errors.session}</span>}
          </FormGroup>
          <FormGroup label="Pair / Instrument" required>
            <select className={inp(!!errors.pair)} value={form.pair} onChange={e => set("pair", e.target.value)}>
              <option value="">Select pair...</option>
              {PAIRS.map(p => <option key={p}>{p}</option>)}
            </select>
            {errors.pair && <span className="text-[11px] text-red">{errors.pair}</span>}
          </FormGroup>
          {form.pair === "Other" && (
            <FormGroup label="Custom Pair" required>
              <input className="inp" placeholder="e.g. USOIL" value={form.customPair} onChange={e => set("customPair", e.target.value)} />
            </FormGroup>
          )}
          <FormGroup label="Trade Type">
            <div className="flex gap-2">
              {(["BUY", "SELL"] as const).map(t => (
                <button key={t} type="button" onClick={() => set("type", t)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                    form.type === t
                      ? t === "BUY" ? "bg-green/15 text-green border-green/30" : "bg-red/15 text-red border-red/30"
                      : "bg-bg-700 text-ink-300 border-black/[0.06] hover:bg-bg-600"
                  )}>
                  {t === "BUY" ? "📈 BUY" : "📉 SELL"}
                </button>
              ))}
            </div>
          </FormGroup>
          <FormGroup label="Lot Size" required>
            <input type="number" className={inp(!!errors.lot)} placeholder="e.g. 2.0" step="0.01" min="0.01"
              value={form.lot} onChange={e => set("lot", e.target.value)} />
            {errors.lot && <span className="text-[11px] text-red">{errors.lot}</span>}
          </FormGroup>
        </div>
      </Card>

      {/* ── Section 2: Price Levels ── */}
      <Card className="p-5 md:p-6 mb-5">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue/10 text-blue text-[10px] flex items-center justify-center font-mono">2</span>
          Price Levels
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <FormGroup label="Entry Price" required>
            <input type="number" className={inp(!!errors.entry)} placeholder="e.g. 2345.50" step="0.01"
              value={form.entry} onChange={e => set("entry", e.target.value)} />
            {errors.entry && <span className="text-[11px] text-red">{errors.entry}</span>}
          </FormGroup>
          <FormGroup label="Stop Loss 🔴">
            <input type="number" className="inp" placeholder="e.g. 2340.00" step="0.01"
              value={form.sl} onChange={e => set("sl", e.target.value)} />
          </FormGroup>
          <FormGroup label="Target 🟢">
            <input type="number" className="inp" placeholder="e.g. 2360.00" step="0.01"
              value={form.target} onChange={e => set("target", e.target.value)} />
          </FormGroup>
          <FormGroup label="Exit Price" required>
            <input type="number" className={inp(!!errors.exit)} placeholder="e.g. 2355.00" step="0.01"
              value={form.exit} onChange={e => set("exit", e.target.value)} />
            {errors.exit && <span className="text-[11px] text-red">{errors.exit}</span>}
          </FormGroup>
          <FormGroup label="Pips (optional)">
            <input type="number" className="inp" placeholder="Auto ya manual" step="0.1"
              value={form.pips} onChange={e => set("pips", e.target.value)} />
          </FormGroup>
          <FormGroup label="Risk:Reward (auto)">
            <input type="number" className="inp" placeholder="Auto calculated" step="0.01"
              value={form.rr} onChange={e => set("rr", e.target.value)} />
          </FormGroup>
        </div>

        {form.rr && (
          <div className={cn(
            "mt-4 p-3 rounded-xl text-sm font-mono font-semibold flex items-center gap-2 border",
            parseFloat(form.rr) >= 2 ? "bg-green/8 text-green border-green/20" : "bg-amber/8 text-amber border-amber/20"
          )}>
            {parseFloat(form.rr) >= 2 ? "✅" : "⚠️"} Risk:Reward = 1:{form.rr}
            {parseFloat(form.rr) < 1.5 && " — Low RR, consider better setup"}
            {parseFloat(form.rr) >= 2 && " — Good RR! 🎯"}
          </div>
        )}
      </Card>

      {/* ── Section 3: P&L (Auto + Editable) ── */}
      <Card className="p-5 md:p-6 mb-5">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber/10 text-amber text-[10px] flex items-center justify-center font-mono">3</span>
          P&L & Strategy
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>
                P&L (₹ mein) <span className="text-red">*</span>
              </Label>
              <div className="flex items-center gap-2">
                {pnlAutoCalc !== null && (
                  <span className="text-[10px] text-ink-400 font-mono flex items-center gap-1">
                    <Zap size={10} className="text-green" />
                    Auto: {pnlAutoCalc >= 0 ? "+" : ""}₹{Math.abs(pnlAutoCalc).toLocaleString("en-IN")}
                  </span>
                )}
                {pnlManualOverride && (
                  <button type="button" onClick={resetPnlToAuto}
                    className="text-[10px] text-blue hover:text-blue/80 flex items-center gap-1 transition-colors">
                    <Zap size={10} /> Reset to auto
                  </button>
                )}
                {!pnlManualOverride && pnlAutoCalc !== null && (
                  <span className="text-[10px] text-green flex items-center gap-1">
                    <Zap size={10} /> Auto-calculated
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                className={cn(
                  inp(!!errors.pnl),
                  pnlManualOverride && "border-amber/40 focus:border-amber/60",
                  !pnlManualOverride && pnlAutoCalc !== null && "border-green/30"
                )}
                placeholder="+5000 ya -2000"
                value={form.pnl}
                onChange={e => handlePnlManualEdit(e.target.value)}
              />
              {!pnlManualOverride && pnlAutoCalc !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Zap size={14} className="text-green opacity-60" />
                </div>
              )}
              {pnlManualOverride && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <PenLine size={14} className="text-amber opacity-60" />
                </div>
              )}
            </div>
            {errors.pnl && <span className="text-[11px] text-red mt-1 block">{errors.pnl}</span>}

            {/* Status indicators */}
            <div className="mt-2 flex gap-2 flex-wrap">
              {pnlAutoCalc !== null && !pnlManualOverride && (
                <span className="text-[10px] bg-green/8 text-green border border-green/20 rounded-lg px-2 py-1">
                  ⚡ Entry/Exit/Lot se calculate hua
                </span>
              )}
              {pnlManualOverride && (
                <span className="text-[10px] bg-amber/8 text-amber border border-amber/20 rounded-lg px-2 py-1">
                  ✏️ Manually edited — click "Reset to auto" to recalculate
                </span>
              )}
              {pnlAutoCalc !== null && pnlManualOverride && parseFloat(form.pnl) !== pnlAutoCalc && (
                <span className="text-[10px] bg-blue/8 text-blue border border-blue/20 rounded-lg px-2 py-1">
                  Auto was: {pnlAutoCalc >= 0 ? "+" : ""}₹{Math.abs(pnlAutoCalc).toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </div>

          <FormGroup label="Strategy Used">
            <select className="inp" value={form.strategy} onChange={e => set("strategy", e.target.value)}>
              <option value="">Select strategy...</option>
              {STRATEGIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormGroup>
        </div>

        {/* P&L Preview Card */}
        {form.pnl && (
          <div className={cn(
            "mt-4 p-4 rounded-xl border flex items-center justify-between",
            isProfit ? "bg-green/8 border-green/20" : pnlVal < 0 ? "bg-red/8 border-red/20" : "bg-bg-700 border-black/[0.06]"
          )}>
            <div>
              <div className="text-xs text-ink-400 mb-1">Trade Result Preview</div>
              <div className={cn("text-2xl font-bold font-mono", isProfit ? "text-green" : pnlVal < 0 ? "text-red" : "text-ink-300")}>
                {pnlVal >= 0 ? "+₹" : "-₹"}{Math.abs(pnlVal).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl">{isProfit ? "🎉" : pnlVal < 0 ? "😤" : "➖"}</div>
              {pnlManualOverride && <div className="text-[10px] text-amber mt-1">Manual edit</div>}
            </div>
          </div>
        )}
      </Card>

      {/* ── Section 4: Emotion ── */}
      <Card className="p-5 md:p-6 mb-5">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-purple/10 text-purple text-[10px] flex items-center justify-center font-mono">4</span>
          Emotion & Mindset
        </div>
        <Label>Trade ke waqt emotion kaisa tha?</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {EMOTIONS.map(em => (
            <button key={em.value} type="button"
              onClick={() => set("emotion", form.emotion === em.value ? "" : em.value)}
              className={cn(
                "px-3 py-2 rounded-xl text-sm border transition-all",
                form.emotion === em.value ? "border-current font-semibold" : "bg-bg-700 text-ink-300 border-black/[0.06] hover:bg-bg-600"
              )}
              style={form.emotion === em.value ? { color: em.color, background: `${em.color}18`, borderColor: `${em.color}40` } : {}}>
              {em.label}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Section 5: Mistakes ── */}
      <Card className="p-5 md:p-6 mb-5">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-red/10 text-red text-[10px] flex items-center justify-center font-mono">5</span>
          Mistakes Ki Gayi? (Honest raho)
        </div>
        <p className="text-xs text-ink-400 mb-4">Jo mistakes ki ho wo select karo. Agar koi nahi ki to neeche green option select karo.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {MISTAKES.map(m => {
            const sel = selectedMistakes.includes(m.id);
            return (
              <button key={m.id} type="button" onClick={() => toggleMistake(m.id)}
                disabled={noMistakes}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                  noMistakes ? "opacity-30 cursor-not-allowed bg-bg-700 border-black/[0.06]" :
                    sel ? "bg-red/8 border-red/30" : "bg-bg-700 border-black/[0.06] hover:bg-bg-600"
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
        <button type="button" onClick={() => { setNoMistakes(p => !p); setSelectedMistakes([]); }}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
            noMistakes ? "bg-green/10 border-green/40 shadow-glow" : "bg-bg-700 border-dashed border-black/[0.1] hover:border-green/20 hover:bg-green/5"
          )}>
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
            noMistakes ? "bg-green border-green" : "border-ink-400")}>
            <CheckCircle2 size={18} className={noMistakes ? "text-white" : "text-ink-500"} />
          </div>
          <div className="text-left flex-1">
            <div className={`text-sm font-bold ${noMistakes ? "text-green" : "text-ink-200"}`}>✅ Koi Mistake Nahi Ki!</div>
            <div className={`text-xs mt-0.5 ${noMistakes ? "text-green/70" : "text-ink-400"}`}>
              {noMistakes ? "Wah! Aaj ek disciplined professional trader ki tarah trade kiya! 🔥" : "Agar aaj sabhi rules follow kiye — ye select karo"}
            </div>
          </div>
          {noMistakes && <div className="text-2xl">🏆</div>}
        </button>

        {selectedMistakes.length > 0 && (
          <div className="mt-3 p-3 bg-red/5 border border-red/15 rounded-xl">
            <div className="text-xs text-red font-semibold">⚠️ {selectedMistakes.length} mistake{selectedMistakes.length > 1 ? "s" : ""} hui — next trade mein improve karo!</div>
          </div>
        )}
      </Card>

      {/* ── Section 6: Journal ── */}
      <Card className="p-5 md:p-6 mb-6">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue/10 text-blue text-[10px] flex items-center justify-center font-mono">6</span>
          Trade Journal
        </div>
        <div className="flex flex-col gap-4">
          <FormGroup label="Trade Ki Reasoning (kyu liya ye trade?)">
            <textarea className="inp" rows={3}
              placeholder="Kya setup tha? Market structure, OB, supply/demand — detail mein likho..."
              value={form.reasoning} onChange={e => set("reasoning", e.target.value)} />
          </FormGroup>
          <FormGroup label="Lesson / Learning (kya seekha?)">
            <textarea className="inp" rows={3}
              placeholder="Iss trade se kya seekha? Kya sahi kiya? Agle baar kya karoge?"
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

      {/* ── Section 7: Screenshot ── */}
      <Card className="p-5 md:p-6 mb-6">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green/10 text-green text-[10px] flex items-center justify-center font-mono">7</span>
          Chart Screenshot (optional)
        </div>
        {screenshot ? (
          <div className="relative inline-block">
            <img src={screenshot} alt="Trade screenshot" className="max-h-64 rounded-xl border border-black/[0.06]" />
            <button type="button" onClick={() => setScreenshot("")}
              className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-bg-950/80 text-red flex items-center justify-center hover:bg-bg-950 transition-all">
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <label className={cn(
            "flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-black/[0.1] cursor-pointer hover:border-green/30 hover:bg-green/5 transition-all",
            compressing && "opacity-50 cursor-wait"
          )}>
            <ImagePlus size={24} className="text-ink-400" />
            <span className="text-xs text-ink-400">{compressing ? "Processing..." : "Chart ka screenshot upload karo"}</span>
            <input type="file" accept="image/*" className="hidden" disabled={compressing}
              onChange={e => handleScreenshot(e.target.files?.[0] || null)} />
          </label>
        )}
      </Card>

      {/* ── Submit ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="lg" loading={loading} className="min-w-[160px]">
          <Save size={16} /> {isEdit ? "Trade Update Karo" : "Trade Save Karo"}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={isEdit ? () => router.push("/journal") : handleClear}>
          <X size={16} /> {isEdit ? "Cancel" : "Clear Form"}
        </Button>
        <span className="ml-auto text-xs text-ink-400 hidden sm:block">
          <span className="text-red">*</span> = zaroori field
        </span>
      </div>
    </form>
  );
}
