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

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Subscribes to Web Push so reminders (e.g. the daily "log your trades" cron)
// arrive as real OS notifications even when no tab is open.
export async function subscribeToPush(): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch {}
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  } catch {}
}

export async function enableNotifications(): Promise<boolean> {
  if (!isNotifySupported()) return false;
  const perm = await Notification.requestPermission();
  const granted = perm === "granted";
  localStorage.setItem(OPT_IN_KEY, granted ? "1" : "0");
  if (granted) subscribeToPush();
  return granted;
}

export function disableNotifications() {
  if (typeof window === "undefined") return;
  localStorage.setItem(OPT_IN_KEY, "0");
  unsubscribeFromPush();
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
