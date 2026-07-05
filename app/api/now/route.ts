import { NextResponse } from "next/server";

// Server clock endpoint for the timer's skew correction (useTimerSession).
// Clients diff this against their local clock so the countdown stays accurate
// even when a device's time is off. Never cached.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { "cache-control": "no-store" } });
}
