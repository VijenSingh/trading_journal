import { NextRequest, NextResponse } from "next/server";

// Fallback for "Share → TraderMind" when the service worker has not taken over yet
// (normally public/sw.js answers this POST and keeps the image). Opens the quick-trade
// page; the user attaches the screenshot there.
export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL("/trade/quick?share=nosw", req.url), 303);
}
