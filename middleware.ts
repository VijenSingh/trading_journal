import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "tm_auth";
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/cron/reminder", // Vercel Cron — guarded by its own CRON_SECRET check, not the session cookie
  "/manifest.json",
  "/sw.js",
  "/icon-192.png",
  "/icon-512.png",
  "/pdf.worker.min.mjs",
]);

async function computeToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("tradermind-authenticated"));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const secret = process.env.AUTH_SECRET;
  // No secret configured — auth gate is off (e.g. local dev without env vars set).
  if (!secret) return NextResponse.next();

  const expected = await computeToken(secret);
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken === expected) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
