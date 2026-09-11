"use client";
import { useState, useEffect, useCallback } from "react";
import { Trade } from "@/lib/types";
import { formatPnl, cn } from "@/lib/utils";
import { useActiveFirm } from "@/lib/activeFirm";
import PageHeader from "@/components/layout/PageHeader";
import { Badge, EmptyState, Loading } from "@/components/ui";
import Link from "next/link";

export default function GalleryPage() {
  const activeFirm = useActiveFirm();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ hasScreenshot: "true", limit: "200" });
    if (activeFirm) params.set("propFirm", activeFirm);
    fetch(`/api/trades?${params.toString()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => setTrades(j.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeFirm]);

  useEffect(() => {
    load();
    window.addEventListener("trade-data-changed", load);
    return () => window.removeEventListener("trade-data-changed", load);
  }, [load]);

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Screenshot Gallery" subtitle={`${trades.length} chart screenshots`} />

      {loading ? <Loading /> : trades.length === 0 ? (
        <EmptyState icon="🖼️" title="Koi screenshot nahi mila" sub="Trade add karte waqt chart screenshot upload karo" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {trades.map(t => (
            <Link key={t._id} href={`/trade/${t._id}/edit`}
              className="group relative rounded-xl overflow-hidden border border-black/[0.06] bg-bg-700 hover:border-black/20 transition-all">
              <img src={t.screenshot} alt={`${t.pair} screenshot`}
                className="w-full aspect-video object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-6">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant={(t.type || "BUY") === "BUY" ? "green" : "red"}>{t.type || "BUY"}</Badge>
                  <span className="text-[11px] font-semibold text-white truncate">{t.pair}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/70 font-mono">{t.date}</span>
                  <span className={cn("text-xs font-mono font-bold", (t.pnl || 0) >= 0 ? "text-green" : "text-red")}>
                    {formatPnl(t.pnl || 0)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
