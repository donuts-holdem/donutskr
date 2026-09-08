import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { Toaster } from "@/components/ui/sonner";
import { SaveToast } from "@/components/admin/SaveToast";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await requireAdmin().catch(() => null);
  if (!supabase) redirect("/admin/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="border-border flex w-full shrink-0 md:w-56 flex-col border-r">
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
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      <Toaster />
      <Suspense fallback={null}><SaveToast /></Suspense>
    </div>
  );
}
