"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full px-3 py-2 rounded-lg text-sm text-ink/50 hover:text-ink hover:bg-glass transition-colors text-left"
    >
      로그아웃
    </button>
  );
}
