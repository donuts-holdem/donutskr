import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Guard all /admin/* routes except /admin/login itself
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !user
  ) {
    const redirectResponse = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  // Membership authorization lives in its DAL and RLS, not in this proxy.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/admin", "/admin/:path*", "/login", "/signup/:path*",
    "/membership/:path*", "/home", "/my", "/leader/:path*",
    "/forgot-password", "/reset-password", "/auth/callback",
  ],
};
