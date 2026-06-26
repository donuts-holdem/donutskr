import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/admin/programs", label: "프로그램" },
  { href: "/admin/seasons", label: "시즌" },
  { href: "/admin/events", label: "일정" },
  { href: "/admin/blind-structures", label: "스트럭처" },
  { href: "/admin/online-league", label: "리그" },
  { href: "/admin/special-pages", label: "특수페이지" },
  { href: "/admin/settings", label: "설정" },
] as const;

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
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {NAV_LINKS.map(({ href, label }) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              className="text-muted-foreground hover:text-foreground w-full justify-start"
            >
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </nav>
        <div className="border-border space-y-2 border-t px-3 py-4">
          <p className="text-muted-foreground truncate px-1 text-xs">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
