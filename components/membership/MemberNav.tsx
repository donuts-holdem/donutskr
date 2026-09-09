"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, UserRound, UsersRound } from "lucide-react";

const links = [
  { href: "/class", label: "CLASS", icon: BookOpen },
  { href: "/club", label: "CLUB", icon: UsersRound },
  { href: "/home", label: "HOME", icon: House },
  { href: "/my", label: "MY", icon: UserRound },
];

export function MemberNav() {
  const pathname = usePathname();
  return <nav aria-label="회원 메뉴" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg">
    <div className="mx-auto grid max-w-lg grid-cols-4 items-center gap-1 px-2 py-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-4 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-gold ${active ? "text-gold" : "text-ink/60 hover:text-ink"}`}><Icon className="size-5" aria-hidden="true" />{label}</Link>;
      })}
    </div>
  </nav>;
}
