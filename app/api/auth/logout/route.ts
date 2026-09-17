export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("tm_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
