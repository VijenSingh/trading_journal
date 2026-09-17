export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "tm_auth";

async function computeToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("tradermind-authenticated"));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.AUTH_PASSWORD;
    const secret = process.env.AUTH_SECRET;

    if (!expectedPassword || !secret) {
      return NextResponse.json({ success: false, error: "Auth configured nahi hai (AUTH_PASSWORD / AUTH_SECRET missing)" }, { status: 500 });
    }
    if (typeof password !== "string" || password !== expectedPassword) {
      return NextResponse.json({ success: false, error: "Galat password" }, { status: 401 });
    }

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
