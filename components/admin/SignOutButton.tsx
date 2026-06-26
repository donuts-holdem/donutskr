"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      className="text-muted-foreground hover:text-foreground w-full justify-start"
    >
      로그아웃
    </Button>
  );
}
