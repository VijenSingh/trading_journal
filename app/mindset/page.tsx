"use client";
import PageHeader from "@/components/layout/PageHeader";
import { Card } from "@/components/ui";
import { useState } from "react";
import { cn } from "@/lib/utils";

const affirmations = [
  { text: "Loss ek trade ka result hai, meri ability ka nahi. Har loss ek lesson hai — main wapas aaunga aur better karunga.", category: "Loss" },
  { text: "Mujhe profit ki zaroorat nahi hai aaj — mujhe sirf apna process follow karna hai. Process sahi hoga to profit aayega khud.", category: "Process" },
  { text: "Ek loss ko cover karne ki koshish mein main 5 aur loss karunga. Rukna aur wait karna hi asli samajhdaari hai.", category: "Revenge" },
  { text: "Market mera dushman nahi hai. Main hi apna sabse bada dushman hoon jab main apne rules todta hoon.", category: "Discipline" },
  { text: "Consistent trader woh hota hai jo boring trade leta hai — exciting nahi. Excitement = increased risk = loss.", category: "Mindset" },
  { text: "Mera SL woh jagah hai jahan main galat sabit ho jaata hoon. Usse gracefully accept karna hi meri strength hai.", category: "SL" },
  { text: "Lot size badhana solution nahi hai kabhi bhi. Discipline hi mera sabse bada weapon hai propfirm mein survive karne ka.", category: "Lot" },
  { text: "Sideways market mein wait karna bhi ek profitable decision hai. No trade = saved capital = protected account.", category: "Patience" },
  { text: "Purane profit ko recover karna mera goal nahi hai. Aaj ka trade aaj ka hai. Fresh start. Fresh mind.", category: "Fresh" },
  { text: "Main ek professional trader hoon. Professional log apne rules se trade karte hain — emotion se nahi.", category: "Pro" },
  { text: "FOMO ek lie hai. Jo setup miss hua woh market hamesha dobara dega. Patience ek edge hai.", category: "FOMO" },
  { text: "Ek trade se meri zindagi nahi badlegi. Lekin ek disciplined week, month, year sab kuch badal sakta hai.", category: "Long Game" },
];

const protocols = [
  {
    trigger: "Revenge Trade Feel Ho Raha Hai",
    color: "red",
    steps: [
      "Screen se uthao — literally uthao",
      "5 minute bahar jao ya paani piyo",
      "Journal mein likho: 'Main revenge trade lene wala tha kyunki ___'",
      "30 minute ka timer set karo",
      "Timer ke baad wapas aao — fresh eyes se dekho",
    ]
  },
  {
    trigger: "Lot Size Badhane Ki Feeling",
    color: "amber",
    steps: [
      "Yad karo: 'Lot badhane se loss cover nahi hoga'",
      "Yad karo: 'Propfirm account ek baar gaya = sab gaya'",
      "Fixed lot par wapas aao",
      "Repeat karo: 'Process. Process. Process.'",
      "Agar feeling nahi ja rahi — aaj ke liye trading band karo",
    ]
  },
  {
    trigger: "Overtrade Ho Raha Hai",
    color: "blue",
    steps: [
      "Count karo — kitne trades ho gaye aaj",
      "2 complete? Laptop band. Done for the day.",
      "Boredom feel ho raha hai? Book padho, walk karo",
      "Yaad karo: 'Best traders sirf 1-2 trade lete hain din mein'",
      "Kal ke liye plan banao — aaj ke liye band",
    ]
  },
  {
    trigger: "Market Sideways Hai",
    color: "purple",
    steps: [
      "Chart pe clearly mark karo: 'SIDEWAYS — NO TRADE'",
      "Screen se kuch time ke liye door raho",
      "Higher timeframe check karo — direction samjho",
      "Wait karo jab tak clear structure na ban jaye",
      "Boredom ka matlab ye nahi ki trade lo",
    ]
  },
];

export default function MindsetPage() {
  const [readAll, setReadAll] = useState<number[]>([]);
  const toggle = (i: number) => setReadAll(prev => prev.includes(i) ? prev.filter(x=>x!==i) : [...prev,i]);

  return (
    <div className="p-4 md:p-8 page-transition max-w-4xl">
      <PageHeader title="Trader Mindset" subtitle="Roz subah trading se pehle padho — loud padho. Subconscious mein daalna hai." />

      {/* Progress */}
      <Card className="p-4 mb-6 bg-green/5 border-green/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-green">Aaj ki affirmations padhi?</div>
          <div className="text-xs font-mono text-green">{readAll.length}/{affirmations.length}</div>
        </div>
        <div className="h-1.5 bg-bg-700 rounded-full overflow-hidden">
          <div className="h-full bg-green rounded-full transition-all" style={{width:`${readAll.length/affirmations.length*100}%`}}/>
        </div>
      </Card>

      {/* Affirmations */}
      <div className="mb-8">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-4">💬 Daily Affirmations — Roz Padho</div>
        <div className="grid gap-3">
          {affirmations.map((a, i) => {
            const read = readAll.includes(i);
            return (
              <button key={i} type="button" onClick={()=>toggle(i)}
                className={cn(
                  "text-left p-5 rounded-2xl border transition-all group",
                  read ? "bg-green/8 border-green/25" : "bg-bg-800 border-white/[0.06] hover:bg-bg-700"
                )}>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "text-3xl opacity-20 group-hover:opacity-40 transition-opacity flex-shrink-0 font-serif",
                    read && "opacity-40 text-green"
                  )}>"</div>
                  <div className="flex-1">
                    <div className={cn("text-sm leading-relaxed font-medium", read?"text-green":"text-ink-100")}>{a.text}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-ink-500 font-mono">#{a.category}</span>
                      {read && <span className="text-[10px] text-green font-semibold">✓ Padh li</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Crisis protocols */}
      <div>
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-4">🆘 Emergency Protocols — Jab Emotions High Hon</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {protocols.map(p => {
            const colors: Record<string,string> = {
              red:"border-red/30 bg-red/5",
              amber:"border-amber/30 bg-amber/5",
              blue:"border-blue/30 bg-blue/5",
              purple:"border-purple/30 bg-purple/5",
            };
            const titleColors: Record<string,string> = {
              red:"text-red",amber:"text-amber",blue:"text-blue",purple:"text-purple"
            };
            return (
              <Card key={p.trigger} className={`p-5 border ${colors[p.color]}`}>
                <div className={`text-xs font-bold uppercase tracking-wide mb-3 ${titleColors[p.color]}`}>
                  🚨 {p.trigger}
                </div>
                <ol className="space-y-2">
                  {p.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-ink-200">
                      <span className={`text-[10px] font-mono font-bold mt-0.5 ${titleColors[p.color]}`}>0{i+1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Weekly review */}
      <Card className="p-6 mt-6">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-4">📅 Weekly Review Questions</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Is week mein kitni mistakes ki? Pattern kya hai?",
            "Kaunsa setup sabse zyada profitable raha?",
            "Emotion kaisa raha? Kya main kabhi revenge trade pe gaya?",
            "Lot size discipline follow ki? Koi exception?",
            "Kya main sideways market mein rule tod ke gaya?",
            "Next week ke liye mujhe kya differently karna chahiye?",
          ].map((q, i) => (
            <div key={i} className="p-3 bg-bg-700 rounded-xl flex items-start gap-2">
              <span className="text-[10px] font-mono text-ink-500 mt-0.5">Q{i+1}</span>
              <span className="text-xs text-ink-200 leading-relaxed">{q}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
