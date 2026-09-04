"use client";
import { useState, useEffect, useCallback } from "react";

let globalVersion = Date.now();

export function invalidatePropFirmAccounts() {
  globalVersion = Date.now();
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("propfirm-accounts-changed"));
}

export interface AccountTxn {
  _id: string;
  propFirm: string;
  type: "investment" | "payout";
  amount: number;
  date: string;
  note: string;
}

export interface FirmSummary {
  firm: string;
  accounts: number;
  investment: number;
  payout: number;
  net: number;
  roi: number | null; // payout / investment; null when no investment recorded
}

export function usePropFirmAccounts() {
  const [txns, setTxns] = useState<AccountTxn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/propfirm-accounts?v=${globalVersion}`, { cache: "no-store" });
      const j = await res.json();
      if (j.success) setTxns(j.data);
    } catch {
      /* ignore — UI shows empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTxns();
    window.addEventListener("propfirm-accounts-changed", fetchTxns);
    return () => window.removeEventListener("propfirm-accounts-changed", fetchTxns);
  }, [fetchTxns]);

  return { txns, loading, refetch: fetchTxns };
}

export function groupByFirm(txns: AccountTxn[]): FirmSummary[] {
  const grouped: Record<string, { accounts: number; investment: number; payout: number }> = {};
  txns.forEach(t => {
    if (!grouped[t.propFirm]) grouped[t.propFirm] = { accounts: 0, investment: 0, payout: 0 };
    if (t.type === "investment") { grouped[t.propFirm].accounts++; grouped[t.propFirm].investment += t.amount; }
    else grouped[t.propFirm].payout += t.amount;
  });
  return Object.entries(grouped)
    .map(([firm, d]) => ({
      firm, ...d,
      net: d.payout - d.investment,
      roi: d.investment > 0 ? d.payout / d.investment : null,
    }))
    .sort((a, b) => b.investment - a.investment);
}

export function overallSummary(rows: FirmSummary[]) {
  return rows.reduce(
    (acc, r) => ({
      accounts: acc.accounts + r.accounts,
      investment: acc.investment + r.investment,
      payout: acc.payout + r.payout,
      net: acc.net + r.net,
    }),
    { accounts: 0, investment: 0, payout: 0, net: 0 }
  );
}
