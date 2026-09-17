"use client";
import { useState, useEffect } from "react";

const KEY = "tm_active_firm";
const EVENT = "active-firm-changed";

// "" means "All Firms" (no filter)
export function getActiveFirm(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) || "";
}

export function setActiveFirm(firm: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, firm);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useActiveFirm(): string {
  // Lazy-initialize from localStorage on the very first render (not in an effect
  // after mount) — otherwise every page briefly renders/fetches with "All Firms"
  // before correcting, which looks like the firm filter got reset on navigation.
  const [firm, setFirm] = useState(() => getActiveFirm());

  useEffect(() => {
    const onChange = () => setFirm(getActiveFirm());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return firm;
}
