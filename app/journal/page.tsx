"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Trade, MISTAKES } from "@/lib/types";
import { formatPnl, getMonthLabel, cn, tradesToCsv, downloadCsv, getToday, csvToTrades } from "@/lib/utils";
import { invalidateTradeData } from "@/lib/useTradeData";
import { useActiveFirm } from "@/lib/activeFirm";
import PageHeader from "@/components/layout/PageHeader";
import { Card, Badge, EmptyState, Loading, Button } from "@/components/ui";
import { Trash2, Pencil, ChevronDown, ChevronUp, Search, Filter, Download, Upload, ChevronLeft, ChevronRight, CheckSquare, Square, X } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const PAGE_SIZE = 20;

export default function JournalPage() {
  const activeFirm = useActiveFirm();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterPair, setFilterPair] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Full unfiltered pair/month list — independent of pagination — so dropdown options stay complete.
  const [allOptions, setAllOptions] = useState<{ pairs: string[]; months: string[] }>({ pairs: [], months: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input before it hits the server.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildParams = useCallback((skip: number) => {
    const params = new URLSearchParams();
    if (activeFirm) params.set("propFirm", activeFirm);
    if (filterPair) params.set("pair", filterPair);
    if (filterResult) params.set("result", filterResult);
    if (dateFrom || dateTo) {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    } else if (filterMonth) {
      params.set("month", filterMonth);
    }
    if (search) params.set("search", search);
    params.set("limit", String(PAGE_SIZE));
    params.set("skip", String(skip));
    return params;
  }, [activeFirm, filterPair, filterResult, filterMonth, dateFrom, dateTo, search]);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/trades?" + buildParams((targetPage - 1) * PAGE_SIZE).toString(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      setTrades(json.data || []);
      setTotal(json.total ?? (json.data || []).length);
    } catch { toast.error("Load error"); }
    finally { setLoading(false); }
  }, [buildParams]);

  const loadOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeFirm) params.set("propFirm", activeFirm);
      const res = await fetch("/api/analytics?" + params.toString(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      const all: Trade[] = json.data || [];
      setAllOptions({
        pairs: Array.from(new Set(all.map(t => t.pair))).sort(),
        months: Array.from(new Set(all.map(t => t.date.slice(0, 7)))).sort().reverse(),
      });
    } catch {}
  }, [activeFirm]);

  // Filters/search/firm changed — jump back to page 1.
  useEffect(() => { setPage(1); }, [activeFirm, filterPair, filterResult, filterMonth, dateFrom, dateTo, search]);
  // Selection is page-scoped — clear it whenever the visible trade list changes.
  useEffect(() => { setSelected(new Set()); }, [page, filterPair, filterResult, filterMonth, dateFrom, dateTo, search, activeFirm]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    const onChange = () => load(page);
    window.addEventListener("trade-data-changed", onChange);
    window.addEventListener("trade-data-changed", loadOptions);
    return () => {
      window.removeEventListener("trade-data-changed", onChange);
      window.removeEventListener("trade-data-changed", loadOptions);
    };
  }, [load, loadOptions, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const del = async (id: string) => {
    if (!confirm("Ye trade delete karein?")) return;
    try {
      const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || "Delete failed");
      toast.success("Trade deleted");
      invalidateTradeData();
      load(page);
    } catch { toast.error("Delete failed — try again"); }
  };

  const { pairs, months } = allOptions;

  // Server already applied pair/result/month/search filters + pagination.
  const filtered = trades;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every(t => t._id && selected.has(t._id));
  const toggleSelectAll = () => {
    if (allSelected) { setSelected(new Set()); return; }
    setSelected(new Set(filtered.map(t => t._id!).filter(Boolean)));
  };

  const bulkExport = () => {
    const rows = filtered.filter(t => t._id && selected.has(t._id));
    if (rows.length === 0) return;
    downloadCsv(`tradermind-selected-${getToday()}.csv`, tradesToCsv(rows));
    toast.success(`${rows.length} trades exported ✅`);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} trades delete karein? Ye undo nahi hoga.`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.all(ids.map(id => fetch(`/api/trades/${id}`, { method: "DELETE" }).then(r => r.ok)));
      const failed = results.filter(ok => !ok).length;
      toast[failed ? "error" : "success"](failed ? `${ids.length - failed}/${ids.length} deleted, ${failed} fail hui` : `${ids.length} trades deleted ✅`);
      invalidateTradeData();
      setSelected(new Set());
      load(page);
    } catch { toast.error("Bulk delete failed"); }
    finally { setBulkDeleting(false); }
  };

  const exportCsv = () => {
    if (filtered.length === 0) { toast.error("Export karne ke liye koi trade nahi"); return; }
    downloadCsv(`tradermind-journal-${getToday()}.csv`, tradesToCsv(filtered));
    toast.success(`${filtered.length} trades exported ✅`);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { trades: parsed, errors } = csvToTrades(text, activeFirm || "");
      if (parsed.length === 0) {
        toast.error(errors[0] || "CSV se koi valid trade nahi mila");
        return;
      }
      const res = await fetch("/api/trades/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades: parsed }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Import failed");
      toast.success(`${json.count} trades import ho gaye ✅${errors.length ? ` (${errors.length} rows skip hui)` : ""}`);
      invalidateTradeData();
      setPage(1);
      load(1);
    } catch {
      toast.error("CSV import nahi ho paya — format check karo");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Trade Journal" subtitle={`${total} trades logged`}>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
          onChange={e => handleImportFile(e.target.files?.[0] || null)} />
        <Button variant="ghost" size="sm" onClick={handleImportClick} loading={importing}>
          <Upload size={13} /> Import CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={exportCsv}>
          <Download size={13} /> Export CSV
        </Button>
        <Link href="/trade/new">
          <Button variant="primary" size="sm">+ New Trade</Button>
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input className="inp" style={{width:"100%", maxWidth:"220px", paddingLeft:"2.25rem"}} placeholder="Search trades (sab trades mein)..."
            value={searchInput} onChange={e=>setSearchInput(e.target.value)} />
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
        <select className="inp" style={{minWidth:"120px"}} value={filterMonth}
          onChange={e=>{setFilterMonth(e.target.value); setDateFrom(""); setDateTo("");}}>
          <option value="">All Months</option>
          {months.map(m=><option key={m} value={m}>{getMonthLabel(m)}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="date" className="inp" style={{minWidth:"140px"}} value={dateFrom}
            onChange={e=>{setDateFrom(e.target.value); setFilterMonth("");}} />
          <span className="text-xs text-ink-400">se</span>
          <input type="date" className="inp" style={{minWidth:"140px"}} value={dateTo}
            onChange={e=>{setDateTo(e.target.value); setFilterMonth("");}} />
        </div>
        {(filterPair||filterResult||filterMonth||dateFrom||dateTo||searchInput) && (
          <Button variant="ghost" size="sm" onClick={()=>{setFilterPair("");setFilterResult("");setFilterMonth("");setDateFrom("");setDateTo("");setSearchInput("");setSearch("");}}>
            Clear filters
          </Button>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs text-ink-400 hover:text-ink-200 transition-colors">
            {allSelected ? <CheckSquare size={15} className="text-purple" /> : <Square size={15} />}
            Is page ke sab select karo
          </button>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-ink-400 font-mono">{selected.size} selected</span>
              <Button variant="ghost" size="sm" onClick={bulkExport}><Download size={12} /> Export</Button>
              <Button variant="danger" size="sm" onClick={bulkDelete} loading={bulkDeleting}><Trash2 size={12} /> Delete</Button>
              <button onClick={() => setSelected(new Set())} className="text-ink-400 hover:text-ink-200">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState icon="📭" title="Koi trade nahi mila" sub="Filters change karo ya pehla trade add karo" />
      ) : (
        <div className="space-y-3">
          {filtered.map(t=>{
            const isOpen = open === t._id;
            const madesMistakes = t.mistakes?.map(id=>MISTAKES.find(m=>m.id===id)?.name).filter(Boolean);
            return (
              <Card key={t._id} className={cn("transition-all", isOpen?"border-black/10":"", selected.has(t._id||"")&&"border-purple/30 bg-purple/[0.03]")}>
                {/* Header row */}
                <div className="flex items-stretch">
                  <button type="button" onClick={() => toggleSelect(t._id || "")}
                    className="flex items-center pl-4 pr-1 text-ink-400 hover:text-purple transition-colors flex-shrink-0">
                    {selected.has(t._id || "") ? <CheckSquare size={16} className="text-purple" /> : <Square size={16} />}
                  </button>
                  <button
                    type="button"
                    className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 text-left"
                    onClick={()=>setOpen(isOpen?null:t._id||null)}
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge variant={(t.type||"BUY")==="BUY"?"green":"red"}>{t.type||"BUY"}</Badge>
                      <span className="font-semibold text-ink-100">{t.pair || "—"}</span>
                      <span className="text-xs text-ink-400 font-mono whitespace-nowrap">{t.date} {t.time}</span>
                      {t.strategy && <span className="text-xs text-ink-400 bg-bg-700 px-2 py-1 rounded-lg">{t.strategy}</span>}
                      {t.emotion && <span className="text-xs text-ink-400">{t.emotion}</span>}
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto flex-shrink-0">
                      <span className={cn("font-mono font-bold text-sm", (t.pnl||0)>=0?"text-green":"text-red")}>
                        {formatPnl(t.pnl||0)}
                      </span>
                      <Badge variant={(t.pnl||0)>=0?"green":"red"}>{(t.pnl||0)>=0?"PROFIT":"LOSS"}</Badge>
                      {isOpen ? <ChevronUp size={14} className="text-ink-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-ink-400 flex-shrink-0" />}
                    </div>
                  </button>
                </div>

                {/* Expanded body */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-black/[0.05] pt-4 space-y-5 animate-fade-in">
                    {/* Price details */}
                    <div className="grid grid-cols-6 gap-3">
                      {[["Lot",t.lot],["Entry",t.entry],["Stop Loss",t.sl],["Target",t.target],["Exit",t.exit],["R:R",t.rr||"—"]].map(([k,v])=>(
                        <div key={k} className="bg-bg-700 rounded-xl p-3">
                          <div className="text-[10px] text-ink-400 mb-1">{k}</div>
                          <div className="text-sm font-mono font-semibold text-ink-100">{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Screenshot */}
                    {t.screenshot && (
                      <div>
                        <div className="text-[10px] text-ink-400 uppercase tracking-widest mb-2">Chart Screenshot</div>
                        <img src={t.screenshot} alt="Trade screenshot" onClick={() => window.open(t.screenshot, "_blank")}
                          className="max-h-48 rounded-xl border border-black/[0.06] cursor-zoom-in hover:opacity-90 transition-opacity" />
                      </div>
                    )}

                    {/* Tags */}
                    {t.tags?.length>0 && (
                      <div className="flex gap-2 flex-wrap">
                        {t.tags.map(tag=><span key={tag} className="text-[10px] bg-bg-700 text-ink-300 px-2 py-1 rounded-lg border border-black/[0.06]">#{tag}</span>)}
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
                      <Link href={`/trade/${t._id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil size={13} /> Edit
                        </Button>
                      </Link>
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

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft size={14} /> Pichla
          </Button>
          <span className="text-xs text-ink-400 font-mono">Page {page} / {totalPages} &middot; {total} trades</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            Agla <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
