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
  const [firm, setFirm] = useState("");

  useEffect(() => {
    setFirm(getActiveFirm());
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
