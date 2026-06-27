import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      {/* Sidebar */}
      <aside className="border-border flex w-56 shrink-0 flex-col border-r">
        <div className="border-border border-b px-5 py-5">
          <span className="text-gold text-lg font-bold tracking-tight">
            DO:NUTS Admin
          </span>
        </div>
        <AdminNav />
        <div className="border-border space-y-2 border-t px-3 py-4">
          <p className="text-muted-foreground truncate px-1 text-xs">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
      <Toaster />
    </div>
  );
}
