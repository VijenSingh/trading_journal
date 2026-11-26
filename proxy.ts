import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, computeToken, safeEqual, authConfig } from "@/lib/authToken";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/cron/reminder", // Vercel Cron — guarded by its own CRON_SECRET check, not the session cookie
  "/api/cron/backup",   // Vercel Cron — refuses to run unless CRON_SECRET is set and matches
  "/manifest.json",
  "/sw.js",
  "/icon-192.png",
  "/icon-512.png",
  "/pdf.worker.min.mjs",
]);

// Next.js 16 "proxy" (formerly middleware): runs before every matched request, on Node.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const cfg = authConfig();
  // Local dev with neither AUTH_SECRET nor AUTH_PASSWORD set — auth gate is off.
  if (cfg === "disabled") return NextResponse.next();
  // Production (or half-configured) without both values: fail closed.
  if (cfg === "misconfigured") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Auth configured nahi hai (AUTH_SECRET / AUTH_PASSWORD missing)" }, { status: 503 });
    }
    return new NextResponse("Auth configured nahi hai — AUTH_SECRET aur AUTH_PASSWORD env variables set karo.", { status: 503 });
  }

  const expected = await computeToken(cfg.secret, cfg.password);
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken && safeEqual(cookieToken, expected)) return NextResponse.next();

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
