"use client";
import { useState, useEffect, useCallback } from "react";
import { Trade } from "./types";

// Global cache-bust counter — increments when data changes
let globalVersion = Date.now();

export function invalidateTradeData() {
  globalVersion = Date.now();
  // Dispatch event so all mounted pages refetch
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("trade-data-changed"));
  }
}

export function useTradeData() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Cache-bust with timestamp so browser never uses stale data
      const res = await fetch(`/api/analytics?v=${globalVersion}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const j = await res.json();
      if (j.success && Array.isArray(j.data)) {
        setTrades(j.data);
      } else {
        setError(j.error || "Data load failed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
    // Listen for data changes from other pages
    window.addEventListener("trade-data-changed", fetchTrades);
    return () => window.removeEventListener("trade-data-changed", fetchTrades);
  }, [fetchTrades]);

  return { trades, loading, error, refetch: fetchTrades };
}
