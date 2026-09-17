"use client";
import { getPatternInsights, formatPnl, cn } from "@/lib/utils";
import { PatternInsight } from "@/lib/utils";
import { useTradeData } from "@/lib/useTradeData";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Badge, EmptyState, Loading } from "@/components/ui";
import { AlertTriangle, TrendingUp } from "lucide-react";

const CATEGORY_LABEL: Record<PatternInsight["category"], string> = {
  mistake: "Mistake", emotion: "Emotion", tag: "Tag", strategy: "Strategy", session: "Session",
};
const CATEGORY_BADGE: Record<PatternInsight["category"], "red" | "purple" | "blue" | "amber" | "gray"> = {
  mistake: "red", emotion: "purple", tag: "blue", strategy: "amber", session: "gray",
};

function InsightCard({ insight }: { insight: PatternInsight }) {
  const warn = insight.severity === "warning";
  return (
    <Card className={cn("p-4", warn ? "border-red/20 bg-red/[0.03]" : "border-green/20 bg-green/[0.03]")}>
      <div className="flex items-center justify-between mb-2.5">
        <Badge variant={CATEGORY_BADGE[insight.category]}>{CATEGORY_LABEL[insight.category]}</Badge>
        <span className="text-[11px] text-ink-400 font-mono">{insight.count} trades</span>
      </div>
      <div className="flex items-start gap-2 mb-3">
        {warn ? <AlertTriangle size={15} className="text-red mt-0.5 flex-shrink-0" /> : <TrendingUp size={15} className="text-green mt-0.5 flex-shrink-0" />}
        <div className="text-sm font-semibold text-ink-100">{insight.label}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-black/[0.05]">
        <div>
          <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">Win Rate</div>
          <div className={cn("text-sm font-mono font-bold", warn ? "text-red" : "text-green")}>
            {insight.winRate}%
            <span className="text-[10px] text-ink-400 font-normal ml-1">
              ({insight.winRateDelta >= 0 ? "+" : ""}{insight.winRateDelta} vs avg)
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">Avg P&L</div>
          <div className={cn("text-sm font-mono font-bold", warn ? "text-red" : "text-green")}>
            {formatPnl(insight.avgPnl)}
            <span className="text-[10px] text-ink-400 font-normal ml-1">
              ({formatPnl(insight.pnlDelta)} vs avg)
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function InsightsPage() {
  const { trades, loading } = useTradeData();

  if (loading) return <div className="p-4 md:p-8"><Loading /></div>;

  const insights = getPatternInsights(trades);
  const warnings = insights.filter(i => i.severity === "warning").sort((a, b) => a.pnlDelta - b.pnlDelta);
  const strengths = insights.filter(i => i.severity === "positive").sort((a, b) => b.pnlDelta - a.pnlDelta);

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Pattern Insights" subtitle="Tumhare mistakes, emotions, tags aur strategy ke asli numbers — bina kisi AI ke, sirf tumhara apna data" />

      {trades.length < 6 ? (
        <EmptyState icon="🔍" title="Abhi pattern detect karne ke liye kam trades hain" sub="Kam se kam 6 trades log karo, phir patterns yahan dikhenge" />
      ) : insights.length === 0 ? (
        <EmptyState icon="✅" title="Koi strong pattern nahi mila" sub="Tumhara performance saari categories mein consistent hai — koi red flag nahi" />
      ) : (
        <div className="space-y-8">
          {warnings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red" />
                <h2 className="text-sm font-bold text-ink-100">Weak Patterns — In se bacho</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {warnings.map((ins, i) => <InsightCard key={i} insight={ins} />)}
              </div>
            </div>
          )}

          {strengths.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-green" />
                <h2 className="text-sm font-bold text-ink-100">Strong Patterns — Ye kaam kar raha hai</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {strengths.map((ins, i) => <InsightCard key={i} insight={ins} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
