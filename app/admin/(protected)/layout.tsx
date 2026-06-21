import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/SignOutButton";

const NAV_LINKS = [
  { href: "/admin/programs", label: "프로그램" },
  { href: "/admin/seasons", label: "시즌" },
  { href: "/admin/events", label: "일정" },
  { href: "/admin/blind-structures", label: "스트럭처" },
  { href: "/admin/online-league", label: "리그" },
  { href: "/admin/tabs", label: "탭" },
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
    <div className="min-h-screen bg-bg text-ink flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <span className="text-lg font-bold text-gold tracking-tight">
            DO:NUTS Admin
          </span>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded-lg text-sm text-ink/70 hover:text-ink hover:bg-glass transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border space-y-2">
          <p className="text-xs text-ink/40 px-1 truncate">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
