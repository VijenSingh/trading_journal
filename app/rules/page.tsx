import PageHeader from "@/components/layout/PageHeader";
import { Card } from "@/components/ui";

const RuleCard = ({ num, text, color = "green" }: { num: string; text: string; color?: "green"|"amber"|"blue" }) => {
  const colors = { green:"border-green/40 bg-green/5", amber:"border-amber/40 bg-amber/5", blue:"border-blue/40 bg-blue/5" };
  const textColors = { green:"text-green", amber:"text-amber", blue:"text-blue" };
  return (
    <div className={`p-4 rounded-xl border-l-4 ${colors[color]} rounded-l-none`}>
      <div className={`text-[10px] font-mono font-bold mb-1.5 ${textColors[color]}`}>{num}</div>
      <div className="text-sm text-ink-100 leading-relaxed font-medium">{text}</div>
    </div>
  );
};

const Section = ({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{emoji}</span>
      <h2 className="text-sm font-semibold text-ink-200 uppercase tracking-widest">{title}</h2>
    </div>
    <div className="grid grid-cols-2 gap-3">{children}</div>
  </div>
);

export default function RulesPage() {
  return (
    <div className="p-8 page-transition max-w-4xl">
      <PageHeader title="Trading Rules" subtitle="Trading se pehle padho. Ye rules tode = account blow." />

      <Card className="p-6 mb-6 border-green/20 bg-green/5">
        <div className="text-sm text-green font-semibold mb-2">⚡ Ek Baat Yaad Rakho</div>
        <p className="text-sm text-ink-200 leading-relaxed">
          Rules woh nahi hote jo sirf likhe hon — rules woh hote hain jo har trade mein follow kiye jayein.
          Ek professional trader ka sabse bada weapon uski discipline hai, uska setup nahi.
        </p>
      </Card>

      <Section title="Pre-Trade Rules — Trade Lene Se Pehle" emoji="🔴">
        <RuleCard num="RULE 01" text="Sirf 2 trades maximum per day. Koi exception nahi — chahe profit ho ya loss. Count karo." />
        <RuleCard num="RULE 02" text="Lot size pehle se fix karo. Loss ho ya profit — lot size KABHI increase nahi karoge loss cover ke liye." />
        <RuleCard num="RULE 03" text="SL aur Target DONO set karo trade lene SE PEHLE. Entry ke baad change nahi hoga kuch." />
        <RuleCard num="RULE 04" text="Sirf clear market structure mein trade karo. Sideways market = NO TRADE. Wait karo, force nahi." />
        <RuleCard num="RULE 05" text="Ek fixed strategy use karo. Setup nahi mila? No trade lena. FOMO pe trade nahi lena kabhi." />
        <RuleCard num="RULE 06" text="Daily max loss limit set karo. Woh limit hit? Din khatam. Screen band karo. Kal fresh start." />
      </Section>

      <Section title="During Trade — Trade Ke Waqt" emoji="🟡">
        <RuleCard num="RULE 07" text="SL hit hone do — kabhi manually band mat karo SL se pehle. SL hit hona = plan sahi tha." color="amber" />
        <RuleCard num="RULE 08" text="Target tak wait karo. Beech mein early exit = pattern todna = consistency khatam." color="amber" />
        <RuleCard num="RULE 09" text="Trade mein ho to doosra chart mat dekho. Ek trade, ek focus. Distraction = bad decision." color="amber" />
        <RuleCard num="RULE 10" text="Emotion feel ho — panic, greed, revenge? Kuch mat karo. Keyboard se haath hata. 10 deep breaths." color="amber" />
      </Section>

      <Section title="Post-Trade Rules — Trade Ke Baad" emoji="🔵">
        <RuleCard num="RULE 11" text="Loss ke baad 30 minute MANDATORY break. Chart band karo, paani piyo, bahar jao. No exceptions." color="blue" />
        <RuleCard num="RULE 12" text="Har trade ka journal likho — iss app mein. Entry reason, exit, emotion, lesson — sab." color="blue" />
        <RuleCard num="RULE 13" text="Profit ke baad bhi STOP. 2 trade complete? Din khatam. Profit protect karna bhi discipline hai." color="blue" />
        <RuleCard num="RULE 14" text="Weekend mein apna journal review karo. Patterns dhundho, mistakes count karo, next week plan banao." color="blue" />
      </Section>

      {/* Emergency rules */}
      <Card className="p-6">
        <div className="text-xs font-semibold text-red uppercase tracking-widest mb-4">🚨 Emergency Rules — Jab Sab Galat Ho Raha Ho</div>
        <div className="space-y-3">
          {[
            "Agar 3 consecutive losses ho gayein — screen band karo. Koi bhi trade mat lo aaj.",
            "Agar anger, frustration ya desperation feel ho — trading ke liye unfit ho. Kal aao.",
            "Agar propfirm daily drawdown limit 50% hit kar li — band karo, risk nahi le sakte.",
            "Agar koi cheez 'definitely work karega' lag raha ho — ye overconfidence hai. Ruko.",
            "Agar tum soch rahe ho 'ek aur trade se sab recover ho jayega' — bilkul mat lena. YE SABSE DANGEROUS THOUGHT HAI.",
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-red/5 border border-red/15 rounded-xl">
              <span className="text-red font-mono text-xs font-bold mt-0.5">E{i+1}</span>
              <span className="text-sm text-ink-200 leading-relaxed">{r}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
