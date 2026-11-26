"use client";
import { useCallback, useEffect, useState } from "react";
import type { AccountStats } from "@/lib/types";

const EVENT = "accounts-changed";

export function invalidateAccounts() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

// Accounts with stats, optionally for one firm; refetches when accounts or trades change.
export function useAccounts(propFirm: string) {
  const [accounts, setAccounts] = useState<AccountStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = propFirm ? `?propFirm=${encodeURIComponent(propFirm)}` : "";
      const j = await (await fetch(`/api/accounts${q}`, { cache: "no-store" })).json();
      if (j.success) setAccounts(j.data); else setError(j.error || "Accounts load nahi hue");
    } catch { setError("Accounts load nahi hue"); }
    finally { setLoading(false); }
  }, [propFirm]);

  useEffect(() => {
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("trade-data-changed", load);
    return () => {
      window.removeEventListener(EVENT, load);
      window.removeEventListener("trade-data-changed", load);
    };
  }, [load]);

  return { accounts, loading, error, reload: load };
}
