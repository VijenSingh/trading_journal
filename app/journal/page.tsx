"use client";
import { useState, useEffect, useCallback } from "react";
import { Trade, MISTAKES } from "@/lib/types";
import { formatPnl, getMonthLabel, cn } from "@/lib/utils";
import { invalidateTradeData } from "@/lib/useTradeData";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Badge, EmptyState, Loading, Button } from "@/components/ui";
import { Trash2, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPair, setFilterPair] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPair) params.set("pair", filterPair);
      if (filterResult) params.set("result", filterResult);
      if (filterMonth) params.set("month", filterMonth);
      const res = await fetch("/api/trades?" + params.toString());
      const json = await res.json();
      setTrades(json.data || []);
    } catch { toast.error("Load error"); }
    finally { setLoading(false); }
  }, [filterPair, filterResult, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm("Ye trade delete karein?")) return;
    try {
      await fetch(`/api/trades/${id}`, { method: "DELETE" });
      toast.success("Trade deleted");
      invalidateTradeData();
      setTrades(prev => prev.filter(t => t._id !== id));
    } catch { toast.error("Delete failed"); }
  };

  const pairs = Array.from(new Set(trades.map(t=>t.pair)));
  const months = Array.from(new Set(trades.map(t=>t.date.slice(0,7)))).sort().reverse();

  const filtered = trades.filter(t =>
    !search || t.pair.toLowerCase().includes(search.toLowerCase()) ||
    t.strategy?.toLowerCase().includes(search.toLowerCase()) ||
    t.reasoning?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Trade Journal" subtitle={`${trades.length} trades logged`}>
        <Link href="/trade/new">
          <Button variant="primary" size="sm">+ New Trade</Button>
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="inp pl-9" style={{width:"100%", maxWidth:"220px"}} placeholder="Search trades..."
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="inp" style={{minWidth:"120px"}} value={filterPair} onChange={e=>setFilterPair(e.target.value)}>
          <option value="">All Pairs</option>
          {pairs.map(p=><option key={p}>{p}</option>)}
        </select>
        <select className="inp" style={{minWidth:"120px"}} value={filterResult} onChange={e=>setFilterResult(e.target.value)}>
          <option value="">All Trades</option>
          <option value="profit">Profit ✅</option>
          <option value="loss">Loss ❌</option>
        </select>
        <select className="inp" style={{minWidth:"120px"}} value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
          <option value="">All Months</option>
          {months.map(m=><option key={m} value={m}>{getMonthLabel(m)}</option>)}
        </select>
        {(filterPair||filterResult||filterMonth||search) && (
          <Button variant="ghost" size="sm" onClick={()=>{setFilterPair("");setFilterResult("");setFilterMonth("");setSearch("");}}>
            Clear filters
          </Button>
        )}
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState icon="📭" title="Koi trade nahi mila" sub="Filters change karo ya pehla trade add karo" />
      ) : (
        <div className="space-y-3">
          {filtered.map(t=>{
            const isOpen = open === t._id;
            const madesMistakes = t.mistakes?.map(id=>MISTAKES.find(m=>m.id===id)?.name).filter(Boolean);
            return (
              <Card key={t._id} className={cn("transition-all", isOpen?"border-white/10":"")}>
                {/* Header row */}
                <button
                  type="button"
                  className="w-full flex items-center gap-4 p-4 text-left"
                  onClick={()=>setOpen(isOpen?null:t._id||null)}
                >
                  <Badge variant={(t.type||"BUY")==="BUY"?"green":"red"}>{t.type||"BUY"}</Badge>
                  <span className="font-semibold text-ink-100">{t.pair || "—"}</span>
                  <span className="text-xs text-ink-400 font-mono">{t.date} {t.time}</span>
                  {t.strategy && <span className="text-xs text-ink-400 bg-bg-700 px-2 py-1 rounded-lg">{t.strategy}</span>}
                  {t.emotion && <span className="text-xs text-ink-400">{t.emotion}</span>}
                  <span className={cn("ml-auto font-mono font-bold text-sm", (t.pnl||0)>=0?"text-green":"text-red")}>
                    {formatPnl(t.pnl||0)}
                  </span>
                  <Badge variant={(t.pnl||0)>=0?"green":"red"}>{(t.pnl||0)>=0?"PROFIT":"LOSS"}</Badge>
                  {isOpen ? <ChevronUp size={14} className="text-ink-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-ink-400 flex-shrink-0" />}
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-white/[0.05] pt-4 space-y-5 animate-fade-in">
                    {/* Price details */}
                    <div className="grid grid-cols-6 gap-3">
                      {[["Lot",t.lot],["Entry",t.entry],["Stop Loss",t.sl],["Target",t.target],["Exit",t.exit],["R:R",t.rr||"—"]].map(([k,v])=>(
                        <div key={k} className="bg-bg-700 rounded-xl p-3">
                          <div className="text-[10px] text-ink-400 mb-1">{k}</div>
                          <div className="text-sm font-mono font-semibold text-ink-100">{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    {t.tags?.length>0 && (
                      <div className="flex gap-2 flex-wrap">
                        {t.tags.map(tag=><span key={tag} className="text-[10px] bg-bg-700 text-ink-300 px-2 py-1 rounded-lg border border-white/[0.06]">#{tag}</span>)}
                      </div>
                    )}

                    {/* Mistakes */}
                    {madesMistakes && madesMistakes.length>0 && (
                      <div className="p-3 bg-red/5 border border-red/15 rounded-xl">
                        <div className="text-xs font-semibold text-red mb-2">⚠️ Mistakes Ki Gayi</div>
                        <div className="flex flex-wrap gap-2">
                          {madesMistakes.map(m=><Badge key={m} variant="red">{m}</Badge>)}
                        </div>
                      </div>
                    )}
                    {t.mistakes?.length===0 && (
                      <div className="p-3 bg-green/5 border border-green/15 rounded-xl text-xs text-green font-semibold">
                        ✅ Koi mistake nahi ki iss trade mein — disciplined trader!
                      </div>
                    )}

                    {/* Journal entries */}
                    {t.reasoning && (
                      <div>
                        <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-2">Trade Reasoning</div>
                        <div className="text-sm text-ink-200 leading-relaxed bg-bg-700 p-3 rounded-xl">{t.reasoning}</div>
                      </div>
                    )}
                    {t.lesson && (
                      <div>
                        <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-2">Lesson / Learning 💡</div>
                        <div className="text-sm text-ink-200 leading-relaxed bg-green/5 border border-green/15 p-3 rounded-xl">{t.lesson}</div>
                      </div>
                    )}
                    {t.rulesFollowed && (
                      <div>
                        <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-2">Rules Status</div>
                        <div className="text-sm text-ink-200 leading-relaxed bg-bg-700 p-3 rounded-xl">{t.rulesFollowed}</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="danger" size="sm" onClick={()=>del(t._id!)}>
                        <Trash2 size={13} /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
