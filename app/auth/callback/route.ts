import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const recovery = type === "recovery" || params.get("next") === "/reset-password";
  const destination = request.nextUrl.clone();
  destination.search = "";
  destination.pathname = "/login";
  destination.searchParams.set("notice", "invalid_link");
  try {
    const supabase = await createServerSupabase();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && (type === "signup" || type === "email" || type === "recovery")
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : null;
    if (result && !result.error) {
      destination.search = "";
      destination.pathname = recovery ? "/reset-password" : "/membership/status";
    }
  } catch {
    // Never forward provider errors, email tokens, or an arbitrary redirect URL.
  }
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
