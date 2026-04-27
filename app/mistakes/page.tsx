"use client";
import { useState, useEffect } from "react";
import { MISTAKES } from "@/lib/types";
import { getToday, cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Button } from "@/components/ui";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function MistakesPage() {
  const [avoided, setAvoided] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getToday();
  const score = avoided.length;
  const pct = Math.round(score / MISTAKES.length * 100);

  useEffect(() => {
    fetch(`/api/mistakes?date=${today}`)
      .then(r => r.json())
      .then(j => setAvoided(j.data?.avoided || []))
      .finally(() => setLoading(false));
  }, [today]);

  const save = async (newAvoided: number[]) => {
    await fetch("/api/mistakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, avoided: newAvoided }),
    });
  };

  const toggle = async (id: number) => {
    const next = avoided.includes(id) ? avoided.filter(m => m !== id) : [...avoided, id];
    setAvoided(next);
    await save(next);
  };

  const reset = async () => {
    setAvoided([]);
    await save([]);
    toast.success("Reset! Fresh start 🌅");
  };

  const displayDate = new Date(today).toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const scoreColor = pct >= 75 ? "text-green" : pct >= 50 ? "text-amber" : "text-red";
  const ringColor = pct >= 75 ? "#00E676" : pct >= 50 ? "#FFB020" : "#FF4560";

  return (
    <div className="p-4 md:p-8 page-transition max-w-4xl">
      <PageHeader title="Daily Mistakes Tracker" subtitle="Aaj ye mistakes nahi ki? Check karo. Roz karo.">
        <Button variant="ghost" size="sm" onClick={reset}>
          <RefreshCw size={14} /> Reset (Naya Din)
        </Button>
      </PageHeader>

      {/* Score section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-8">
          {/* Circle */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke={ringColor} strokeWidth="8"
                strokeLinecap="round" strokeDasharray={`${2*Math.PI*42}`}
                strokeDashoffset={`${2*Math.PI*42*(1-pct/100)}`}
                style={{transition:"stroke-dashoffset 0.5s ease"}}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-2xl font-bold font-mono ${scoreColor}`}>{score}/{MISTAKES.length}</div>
              <div className="text-[10px] text-ink-400">avoided</div>
            </div>
          </div>

          <div className="flex-1">
            <div className={`text-2xl font-bold ${scoreColor} mb-1`}>
              {pct >= 75 ? "🔥 Excellent Discipline!" : pct >= 50 ? "⚠️ Theek Hai, Aur Improve Karo" : "❌ Mistakes Bahut Hain — Focus Karo!"}
            </div>
            <div className="text-sm text-ink-300 mb-4">{displayDate}</div>
            <div className="h-2 bg-bg-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{width:`${pct}%`, background:ringColor, opacity:0.8}}/>
            </div>
            <div className="flex justify-between text-[10px] text-ink-400 mt-1 font-mono">
              <span>0/8</span>
              <span>{score}/8 avoided today</span>
              <span>8/8</span>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-5xl font-black font-mono ${scoreColor}`}>{pct}%</div>
            <div className="text-xs text-ink-400">Score aaj ka</div>
          </div>
        </div>
      </Card>

      {/* Mistakes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MISTAKES.map(m => {
          const ok = avoided.includes(m.id);
          return (
            <button key={m.id} type="button" onClick={() => toggle(m.id)}
              className={cn(
                "text-left p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4",
                ok
                  ? "bg-green/8 border-green/25 shadow-glow"
                  : "bg-bg-800 border-white/[0.06] hover:bg-bg-700 hover:border-white/10"
              )}>

              {/* Check circle */}
              <div className={cn(
                "w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                ok ? "bg-green border-green" : "border-ink-500"
              )}>
                {ok && <span className="text-bg-950 text-xs font-bold">✓</span>}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-ink-500">#{String(m.id).padStart(2,"0")}</span>
                  <span className={cn("text-sm font-semibold", ok ? "text-green" : "text-ink-100")}>{m.name}</span>
                </div>
                <p className={cn("text-xs leading-relaxed", ok ? "text-green/70" : "text-ink-400")}>
                  {ok ? "✅ Aaj ye mistake nahi ki — great work!" : m.tip}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Motivational message */}
      <Card className="p-5 mt-6 border-green/20 bg-green/5">
        <div className="text-sm text-green font-semibold mb-2">🧠 Yaad Rakho</div>
        <p className="text-sm text-ink-200 leading-relaxed">
          {score >= 7
            ? "Bahut acha! Aaj tune ek professional trader ki tarah kaam kiya. Iss discipline ko kal bhi rakhna."
            : score >= 5
            ? "Acha progress hai. Jo mistakes ab bhi ho rahi hain, unhe kal avoid karne ki koshish karo."
            : "Abhi bahut kaam baaki hai. Ek mistake ek baar mein focus karo aur usse pehle fix karo."
          }
        </p>
      </Card>
    </div>
  );
}
