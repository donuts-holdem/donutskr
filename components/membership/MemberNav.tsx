"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Handshake, House, ListChecks, UserRound, UsersRound } from "lucide-react";

const links = [
  { href: "/class", label: "CLASS", icon: BookOpen },
  { href: "/club", label: "CLUB", icon: UsersRound },
  { href: "/home", label: "회원 홈", icon: House },
  { href: "/partners", label: "PARTNERS", icon: Handshake },
  { href: "/my", label: "MY", icon: UserRound },
];
const leaderLinks = [
  { href:"/leader", label:"운영 홈", icon:House },
  { href:"/leader/class", label:"CLASS", icon:BookOpen },
  { href:"/leader/club", label:"CLUB", icon:UsersRound },
  { href:"/leader/meetings", label:"모임", icon:CalendarDays },
  { href:"/leader/approvals", label:"승인", icon:ListChecks },
];

export function MemberNav() {
  const pathname = usePathname();
  const operating = pathname.startsWith("/leader");
  return <nav aria-label={operating ? "운영진 메뉴" : "회원 메뉴"} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-safe-bottom lg:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5 items-center gap-1 px-2 py-3">
      {(operating ? leaderLinks : links).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/leader" && pathname.startsWith(`${href}/`));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-2xs font-semibold focus-visible:outline-2 focus-visible:outline-gold ${active ? "text-gold" : "text-ink/70 hover:text-ink"}`}><Icon className="size-5" aria-hidden="true" />{label}</Link>;
      })}
    </div>
  </nav>;
}
