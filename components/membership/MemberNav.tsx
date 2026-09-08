"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, UserRound } from "lucide-react";

const links = [{ href: "/home", label: "HOME", icon: House }, { href: "/my", label: "MY", icon: UserRound }];

export function MemberNav() {
  const pathname = usePathname();
  return <nav aria-label="회원 메뉴" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg">
    <div className="mx-auto flex max-w-lg items-center justify-center gap-12 px-5 py-3">
      {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-4 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-gold ${pathname === href ? "text-gold" : "text-ink/60 hover:text-ink"}`}><Icon className="size-5" aria-hidden="true" />{label}</Link>)}
    </div>
  </nav>;
}
