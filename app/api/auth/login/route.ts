export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectDB, LoginAttemptModel } from "@/lib/db";

const COOKIE_NAME = "tm_auth";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

async function computeToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("tradermind-authenticated"));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.AUTH_PASSWORD;
    const secret = process.env.AUTH_SECRET;

    if (!expectedPassword || !secret) {
      return NextResponse.json({ success: false, error: "Auth configured nahi hai (AUTH_PASSWORD / AUTH_SECRET missing)" }, { status: 500 });
    }

    await connectDB();
    const ip = getIp(req);
    const attempt = await LoginAttemptModel.findOne({ ip });

    if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
      const waitMin = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Bahut saare galat attempts — ${waitMin} minute baad try karo` },
        { status: 429 }
      );
    }

    if (typeof password !== "string" || password !== expectedPassword) {
      const nextCount = (attempt?.count || 0) + 1;
      const locked = nextCount >= MAX_ATTEMPTS;
      await LoginAttemptModel.findOneAndUpdate(
        { ip },
        { count: locked ? 0 : nextCount, lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MS) : null },
        { upsert: true }
      );
      if (locked) {
        return NextResponse.json(
          { success: false, error: `Bahut saare galat attempts — ${LOCKOUT_MS / 60000} minute baad try karo` },
          { status: 429 }
        );
      }
      return NextResponse.json({ success: false, error: "Galat password" }, { status: 401 });
    }

    // Correct password — clear this IP's attempt history.
    await LoginAttemptModel.deleteOne({ ip });

    const token = await computeToken(secret);
    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (e) {
    console.error("POST /api/auth/login:", e);
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
  }
}
