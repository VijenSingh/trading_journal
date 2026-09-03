"use client";
import { useEffect } from "react";
import { invalidateTradeData } from "@/lib/useTradeData";

// Whenever the tab regains focus or becomes visible again, treat it like a
// data-changed event so every mounted page refetches — covers changes made
// from another tab, another device, or directly against the API.
export default function DataSyncOnFocus() {
  useEffect(() => {
    const onFocus = () => invalidateTradeData();
    const onVisibility = () => { if (!document.hidden) invalidateTradeData(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
