// Shared by middleware (Edge runtime) and the login route (Node runtime) — both have
// Web Crypto on globalThis, so this module must not import anything Node-only.

export const COOKIE_NAME = "tm_auth";

// The session token is an HMAC over the current password. Changing AUTH_PASSWORD
// (or AUTH_SECRET) therefore invalidates every existing session cookie, so a leaked
// cookie or a lost device can be locked out by rotating the password.
export async function computeToken(secret: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`tradermind-authenticated:${password}`));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Length-independent comparison so response timing does not reveal how much of a guess matched.
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

// Auth is off only when it is deliberately unconfigured outside production (local dev).
// In production a missing secret or password must lock the app, never open it.
export function authConfig(): { secret: string; password: string } | "disabled" | "misconfigured" {
  const secret = process.env.AUTH_SECRET || "";
  const password = process.env.AUTH_PASSWORD || "";
  if (secret && password) return { secret, password };
  if (process.env.NODE_ENV !== "production" && !secret && !password) return "disabled";
  return "misconfigured";
}
