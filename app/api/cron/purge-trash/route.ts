import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCron } from "@/lib/cron";

// Vercel Cron (see vercel.json) hits this daily. The request carries no admin
// cookies, so it uses a service-role client that bypasses RLS to run the
// security-definer purge_trash() function. Access is gated by CRON_SECRET.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error } = await supabase.rpc("purge_trash");
  if (error) {
    // Log the detail server-side only; don't leak DB error internals to callers.
    console.error("purge_trash cron failed:", error);
    return NextResponse.json({ error: "purge failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
