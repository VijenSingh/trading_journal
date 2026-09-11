"use client";
import { MISTAKES } from "@/lib/types";
import { useTradeData, invalidateTradeData } from "@/lib/useTradeData";
import { useActiveFirm } from "@/lib/activeFirm";
import { formatPnl, getAnalytics, getCumulative, getMonthStats, fmt, getToday, getWeekKey, cn } from "@/lib/utils";
import { StatCard, Card, CardTitle, Badge, EmptyState } from "@/components/ui";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Award, AlertTriangle, Plus, Eye, Trash2, Brain, X, Bell, BellOff } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { MINDSET_STORAGE_KEY, affirmations as mindsetAffirmations } from "@/lib/mindset";
import { isNotifySupported, isNotifyOptedIn, isNotifyGranted, enableNotifications, disableNotifications, notifyOnce } from "@/lib/notify";

function computeStreak(history: { date: string; avoided: number[] }[]): number {
  const map = new Map(history.map(h => [h.date, h.avoided.length]));
  let streak = 0;
  const d = new Date();
  if (!map.has(getToday())) d.setDate(d.getDate() - 1);
  while (true) {
    const key = d.toISOString().split("T")[0];
    const score = map.get(key);
    if (score !== undefined && score >= 6) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

// Safe field helpers
const sp = (v: unknown): string => (typeof v === "string" && v ? v : "");
const np = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : parseFloat(String(v ?? 0)) || 0);
const pairShort = (pair: unknown): string => {
  const p = sp(pair);
  if (!p) return "—";
  return p.split(" ")[0] || p;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-700 border border-black/10 rounded-xl p-3 text-xs font-mono shadow-card">
      <div className="text-ink-300 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {np(p.value) >= 0 ? "+" : ""}₹{Math.abs(np(p.value)).toLocaleString("en-IN")}
        </div>
      ))}
    </div>
  );
};

export default function DashboardClient() {
  const { trades, loading } = useTradeData();
  const activeFirm = useActiveFirm();
  const [avoided, setAvoided] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [mindsetReadToday, setMindsetReadToday] = useState(true); // default true so banner doesn't flash before check
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [weeklyLossLimit, setWeeklyLossLimit] = useState(0);
  const [notifyOn, setNotifyOn] = useState(false);

  useEffect(() => {
    setNotifyOn(isNotifyOptedIn() && isNotifyGranted());
  }, []);

  const toggleNotify = async () => {
    if (notifyOn) {
      disableNotifications();
      setNotifyOn(false);
      return;
    }
    const granted = await enableNotifications();
    setNotifyOn(granted);
    if (!granted) alert("Notifications allow nahi hui — browser settings mein permission check karo.");
  };

  const loadAvoided = useCallback(() => {
    fetch(`/api/mistakes?date=${getToday()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => setAvoided(j.data?.avoided || []))
      .catch(() => {});
  }, []);

  const loadStreak = useCallback(() => {
    fetch(`/api/mistakes?history=true`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => setStreak(computeStreak(j.data || [])))
      .catch(() => {});
  }, []);

  const checkMindset = useCallback(() => {
    try {
      const raw = localStorage.getItem(MINDSET_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const doneToday = parsed?.date === getToday() && parsed.ids.length >= mindsetAffirmations.length;
      setMindsetReadToday(doneToday);
    } catch { setMindsetReadToday(true); }
  }, []);

  const loadWeeklyLimit = useCallback(() => {
    const firmParam = activeFirm ? `&propFirm=${encodeURIComponent(activeFirm)}` : "";
    fetch(`/api/goals?periodType=week&periodKey=${getWeekKey()}${firmParam}`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => setWeeklyLossLimit(j.data?.maxLossLimit || 0))
      .catch(() => {});
  }, [activeFirm]);

  useEffect(() => {
    loadAvoided();
    loadStreak();
    checkMindset();
    loadWeeklyLimit();
    window.addEventListener("trade-data-changed", loadAvoided);
    window.addEventListener("trade-data-changed", loadStreak);
    window.addEventListener("trade-data-changed", checkMindset);
    window.addEventListener("trade-data-changed", loadWeeklyLimit);
    return () => {
      window.removeEventListener("trade-data-changed", loadAvoided);
      window.removeEventListener("trade-data-changed", loadStreak);
      window.removeEventListener("trade-data-changed", checkMindset);
      window.removeEventListener("trade-data-changed", loadWeeklyLimit);
    };
  }, [loadAvoided, loadStreak, checkMindset, loadWeeklyLimit]);

  const clearAllData = async () => {
    setClearing(true);
    try {
      const params = activeFirm ? `?propFirm=${encodeURIComponent(activeFirm)}` : "";
      const res = await fetch(`/api/trades/clear${params}`, { method: "DELETE" });
      const j = await res.json();
      if (j.success) {
        invalidateTradeData();
        setShowClearModal(false);
        window.location.reload();
      }
    } catch { alert("Error clearing data"); }
    finally { setClearing(false); }
  };
  const a = useMemo(() => getAnalytics(trades), [trades]);
  const cumData = useMemo(() => getCumulative(trades), [trades]);
  const monthStats = useMemo(() => getMonthStats(trades).slice(-6), [trades]);
  const recent = useMemo(() => [...trades]
    .sort((x, y) => (y.date + (y.time || "")).localeCompare(x.date + (x.time || "")))
    .slice(0, 8), [trades]);
  const mistakeScore = (avoided || []).length;
  const weekPnl = useMemo(() => {
    const thisWeek = getWeekKey();
    return trades.filter(t => getWeekKey(t.date) === thisWeek).reduce((s, t) => s + np(t.pnl), 0);
  }, [trades]);
  const weekLoss = Math.abs(Math.min(0, weekPnl));
  const limitBreached = weeklyLossLimit > 0 && weekLoss >= weeklyLossLimit;
  const limitWarning = weeklyLossLimit > 0 && !limitBreached && weekLoss >= weeklyLossLimit * 0.8;
  const todayTradeCount = useMemo(
    () => trades.filter(t => t.date === getToday()).length,
    [trades]
  );
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Push a real browser notification for the same risk conditions already shown as banners below —
  // useful when the tab is open but not focused. Each fires at most once per day (see notifyOnce).
  useEffect(() => {
    if (!notifyOn || loading) return;
    const firm = activeFirm ? ` (${activeFirm})` : "";
    if (limitBreached) {
      notifyOnce("weekly-loss-breach", "🚨 Weekly loss limit cross ho gayi", `Loss -₹${weekLoss.toLocaleString("en-IN")} / ₹${weeklyLossLimit.toLocaleString("en-IN")} limit${firm}. Trading rok do.`);
    } else if (limitWarning) {
      notifyOnce("weekly-loss-warning", "⚠️ Weekly loss limit ke paas", `Loss -₹${weekLoss.toLocaleString("en-IN")} / ₹${weeklyLossLimit.toLocaleString("en-IN")} limit${firm}. Savdhaan raho.`);
    }
    if (todayTradeCount > 2) {
      notifyOnce("overtrade", "⚠️ Overtrading alert", `Aaj ${todayTradeCount} trades ho chuke hain${firm}. Zaroori na ho to ruk jao.`);
    }
    if (!mindsetReadToday) {
      notifyOnce("mindset", "🧠 Mindset reminder", "Aaj affirmations nahi padhi — trading se pehle 2 min nikaalo.");
    }
  }, [notifyOn, loading, limitBreached, limitWarning, weekLoss, weeklyLossLimit, activeFirm, todayTradeCount, mindsetReadToday]);

  // Top pairs by P&L
  const topPairs = useMemo(() => {
    const pairPnl: Record<string, number> = {};
    trades.forEach(t => {
      const p = pairShort(t.pair);
      if (p && p !== "—") pairPnl[p] = (pairPnl[p] || 0) + np(t.pnl);
    });
    return Object.entries(pairPnl)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 5);
  }, [trades]);

  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Dashboard" subtitle={today}>
        {isNotifySupported() && (
          <button onClick={toggleNotify} title={notifyOn ? "Reminders band karo" : "Reminders on karo (overtrade, loss limit, mindset)"}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
              notifyOn ? "bg-green/10 text-green border-green/20 hover:bg-green/20" : "bg-bg-700 text-ink-300 border-black/[0.06] hover:bg-bg-600"
            )}>
            {notifyOn ? <Bell size={13} /> : <BellOff size={13} />} {notifyOn ? "Reminders On" : "Reminders Off"}
          </button>
        )}
        {trades.length > 0 && (
          <button onClick={() => setShowClearModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-red/10 text-red border border-red/20 rounded-xl text-xs font-semibold hover:bg-red/20 transition-all">
            <Trash2 size={13} /> Clear Old Data
          </button>
        )}
        <Link href="/trade/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple to-pink text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-glow-purple">
            <Plus size={16} /> New Trade
          </button>
        </Link>
        {showClearModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowClearModal(false)}>
            <div className="bg-bg-800 border border-red/30 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-bold text-ink-100 mb-2">
                ⚠️ {activeFirm ? `${activeFirm} Ka Data Delete Karein?` : "Saara Data Delete Karein?"}
              </div>
              <p className="text-sm text-ink-300 mb-5 leading-relaxed">
                Ye action <strong className="text-red">undo nahi hoga</strong>. MongoDB se {activeFirm ? `sirf ${activeFirm} firm ke` : "saare"} {trades.length} trades permanently delete ho jayenge. Sirf karo agar ye test/purana data hai.
              </p>
              <div className="flex gap-3">
                <button onClick={clearAllData} disabled={clearing}
                  className="flex-1 py-2.5 bg-red text-white rounded-xl text-sm font-bold hover:bg-red/80 transition-all disabled:opacity-50">
                  {clearing ? "Deleting..." : "Haan, Delete Karo"}
                </button>
                <button onClick={() => setShowClearModal(false)}
                  className="flex-1 py-2.5 bg-bg-700 text-ink-200 rounded-xl text-sm font-semibold hover:bg-bg-600 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </PageHeader>

      {limitBreached && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-red/30 bg-red/10">
          <AlertTriangle size={18} className="text-red flex-shrink-0" />
          <div className="flex-1 text-sm text-ink-200">
            <span className="font-semibold text-red">🚨 Is hafte ki max loss limit cross ho gayi{activeFirm ? ` (${activeFirm})` : ""}!</span>{" "}
            Loss: <span className="font-mono font-semibold text-red">-₹{weekLoss.toLocaleString("en-IN")}</span> / ₹{weeklyLossLimit.toLocaleString("en-IN")} limit.
            Is hafte ke liye trading rok do.
          </div>
        </div>
      )}
      {!limitBreached && limitWarning && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-amber/25 bg-amber/8">
          <AlertTriangle size={18} className="text-amber flex-shrink-0" />
          <div className="flex-1 text-sm text-ink-200">
            <span className="font-semibold text-amber">⚠️ Weekly loss limit ke paas ho{activeFirm ? ` (${activeFirm})` : ""}.</span>{" "}
            Loss: <span className="font-mono font-semibold text-amber">-₹{weekLoss.toLocaleString("en-IN")}</span> / ₹{weeklyLossLimit.toLocaleString("en-IN")} limit. Savdhaan raho.
          </div>
        </div>
      )}
      {todayTradeCount > 2 && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-amber/25 bg-amber/8">
          <AlertTriangle size={18} className="text-amber flex-shrink-0" />
          <div className="flex-1 text-sm text-ink-200">
            <span className="font-semibold text-amber">⚠️ Aaj {todayTradeCount} trades ho chuke hain.</span>{" "}
            Overtrading ek common discipline mistake hai — zaroori na ho to aur trade mat lo.
          </div>
        </div>
      )}

      {!mindsetReadToday && !bannerDismissed && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-purple/25 bg-purple/8">
          <Brain size={18} className="text-purple flex-shrink-0" />
          <div className="flex-1 text-sm text-ink-200">
            <span className="font-semibold text-purple">Aaj Mindset affirmations nahi padhi.</span>{" "}
            Trading se pehle 2 minute nikaalo — subconscious mein discipline daalna zaroori hai.
          </div>
          <Link href="/mindset" className="text-xs font-semibold text-purple hover:text-purple/80 whitespace-nowrap">
            Ab Padho →
          </Link>
          <button onClick={() => setBannerDismissed(true)} className="text-ink-500 hover:text-ink-300 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          label="Total P&L"
          value={formatPnl(a.totalPnl)}
          sub={`${a.totalTrades} trades total`}
          color={a.totalPnl >= 0 ? "green" : "red"}
          icon={a.totalPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <StatCard
          label="Win Rate"
          value={`${a.winRate}%`}
          sub={`${a.totalWins}W / ${a.totalLosses}L`}
          color={a.winRate >= 50 ? "green" : "red"}
          icon={<Award size={16} />}
        />
        <StatCard
          label="Profit Factor"
          value={a.profitFactor === 999 ? "∞" : fmt(a.profitFactor)}
          sub={`Avg RR: ${fmt(a.avgRR)}`}
          color={a.profitFactor >= 1 ? "green" : "red"}
        />
        <StatCard
          label="Discipline Score"
          value={`${mistakeScore}/8`}
          sub={streak > 0 ? `🔥 ${streak} din ka streak` : "Aaj ki mistakes avoided"}
          color={mistakeScore >= 6 ? "green" : mistakeScore >= 3 ? "amber" : "red"}
          icon={<AlertTriangle size={16} />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Cumulative P&L */}
        <Card className="md:col-span-2 p-5">
          <CardTitle>Cumulative P&L</CardTitle>
          {cumData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumData} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={a.totalPnl >= 0 ? "#10B981" : "#F43F5E"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={a.totalPnl >= 0 ? "#10B981" : "#F43F5E"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8B85A0" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8B85A0" }} axisLine={false} tickLine={false}
                  tickFormatter={v => "₹" + Math.abs(np(v) / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cumulative" name="P&L"
                  stroke={a.totalPnl >= 0 ? "#10B981" : "#F43F5E"}
                  fill="url(#cumGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📈" title="Koi trade nahi abhi" sub="Pehla trade log karo!" />
          )}
        </Card>

        {/* Win/Loss Pie */}
        <Card className="p-5">
          <CardTitle>Win / Loss</CardTitle>
          {a.totalTrades > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Wins", value: a.totalWins },
                      { name: "Losses", value: a.totalLosses },
                    ]}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value"
                  >
                    <Cell fill="#10B981" opacity={0.85} />
                    <Cell fill="#F43F5E" opacity={0.85} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: "10px", fontSize: "12px", fontFamily: "JetBrains Mono",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-around mt-2">
                <div className="text-center">
                  <div className="text-lg font-bold font-mono text-green">{a.totalWins}</div>
                  <div className="text-[10px] text-ink-400">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold font-mono text-red">{a.totalLosses}</div>
                  <div className="text-[10px] text-ink-400">Losses</div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon="📊" title="No data yet" />
          )}
        </Card>
      </div>

      {/* Monthly Bar + Top Pairs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2 p-5">
          <CardTitle>Monthly P&L</CardTitle>
          {monthStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthStats} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8B85A0" }} axisLine={false} tickLine={false}
                  tickFormatter={v => sp(v).slice(0, 3)} />
                <YAxis tick={{ fontSize: 10, fill: "#8B85A0" }} axisLine={false} tickLine={false}
                  tickFormatter={v => "₹" + Math.abs(np(v) / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                  {monthStats.map((m, i) => (
                    <Cell key={i} fill={np(m.pnl) >= 0 ? "#10B981" : "#F43F5E"} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📅" title="No monthly data" />
          )}
        </Card>

        {/* Top Pairs */}
        <Card className="p-5">
          <CardTitle>Top Pairs by P&L</CardTitle>
          {topPairs.length > 0 ? (
            <div className="space-y-3">
              {topPairs.map(([pair, pnl]) => {
                const maxAbs = Math.max(...topPairs.map(([, v]) => Math.abs(v)), 1);
                const pct = Math.abs(pnl) / maxAbs * 100;
                return (
                  <div key={pair}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-ink-200">{pair}</span>
                      <span className={`text-xs font-mono font-semibold ${pnl >= 0 ? "text-green" : "text-red"}`}>
                        {formatPnl(pnl)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-600 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pnl >= 0 ? "#10B981" : "#F43F5E", opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="💹" title="No trades yet" />
          )}
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Avg Win" value={formatPnl(a.avgWin)} color="green" />
        <StatCard label="Avg Loss" value={formatPnl(-a.avgLoss)} color="red" />
        <StatCard label="Best Trade" value={formatPnl(a.maxWin)} sub={a.bestPair} color="green" />
        <StatCard label="Worst Trade" value={formatPnl(-a.maxLoss)} sub={a.worstPair} color="red" />
      </div>

      {/* Recent Trades */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="mb-0">Recent Trades</CardTitle>
          <Link href="/journal" className="text-xs text-green hover:text-green-bright flex items-center gap-1 transition-colors">
            <Eye size={12} /> View All
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {["Date", "Pair", "Type", "Lot", "Entry", "Exit", "P&L", "Strategy", "Result"].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-semibold text-ink-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((t, idx) => {
                  const pnl = np(t.pnl);
                  const pair = pairShort(t.pair);
                  const type = sp(t.type) || "BUY";
                  return (
                    <tr key={sp(t._id) || idx} className="tr-hover border-b border-black/[0.03] last:border-0">
                      <td className="py-3 px-3 text-ink-400 font-mono text-xs">{sp(t.date) || "—"}</td>
                      <td className="py-3 px-3 font-semibold text-ink-100">{pair}</td>
                      <td className="py-3 px-3">
                        <Badge variant={type === "BUY" ? "green" : "red"}>{type}</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-ink-300 text-xs">{np(t.lot) || "—"}</td>
                      <td className="py-3 px-3 font-mono text-ink-300 text-xs">{np(t.entry) || "—"}</td>
                      <td className="py-3 px-3 font-mono text-ink-300 text-xs">{np(t.exit) || "—"}</td>
                      <td className={`py-3 px-3 font-mono font-semibold text-xs ${pnl >= 0 ? "text-green" : "text-red"}`}>
                        {formatPnl(pnl)}
                      </td>
                      <td className="py-3 px-3 text-ink-400 text-xs">{sp(t.strategy) || "—"}</td>
                      <td className="py-3 px-3">
                        <Badge variant={pnl >= 0 ? "green" : "red"}>{pnl >= 0 ? "PROFIT" : "LOSS"}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="📭" title="Koi trade abhi nahi" sub="Pehla trade log karo aur yahan dikhega!" />
        )}
      </Card>
    </div>
  );
}
