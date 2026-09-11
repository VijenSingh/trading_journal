"use client";
import { getToday } from "./utils";

const OPT_IN_KEY = "tm_notify_optin";
const FIRED_PREFIX = "tm_notify_fired_";

export function isNotifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isNotifyOptedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(OPT_IN_KEY) === "1";
}

export function isNotifyGranted(): boolean {
  return isNotifySupported() && Notification.permission === "granted";
}

export async function enableNotifications(): Promise<boolean> {
  if (!isNotifySupported()) return false;
  const perm = await Notification.requestPermission();
  const granted = perm === "granted";
  localStorage.setItem(OPT_IN_KEY, granted ? "1" : "0");
  return granted;
}

export function disableNotifications() {
  if (typeof window === "undefined") return;
  localStorage.setItem(OPT_IN_KEY, "0");
}

// Fires a browser notification at most once per (tag, calendar day) — so re-renders
// or repeated checks in the same session don't spam the same alert.
export async function notifyOnce(tag: string, title: string, body: string) {
  if (typeof window === "undefined" || !isNotifyOptedIn() || !isNotifyGranted()) return;
  const key = FIRED_PREFIX + tag + "_" + getToday();
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, tag, icon: "/icon-192.png", badge: "/icon-192.png" });
    } else {
      new Notification(title, { body, tag, icon: "/icon-192.png" });
    }
  } catch {}
}
