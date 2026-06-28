"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "프로그램", href: "/programs" },
  { label: "일정", href: "/schedule" },
  { label: "시리즈", href: "/series" },
  { label: "리더보드", href: "/leaderboard" },
  { label: "온라인 리그", href: "/online-league" },
  { label: "챌린지", href: "/challenge" },
];

export function HeaderNav() {
  // Match the section, including detail routes (e.g. /schedule/[id] → 일정).
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="주요 메뉴"
      className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
    >
      {NAV_LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-pill px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "text-gold bg-gold/10"
                : "text-ink/60 hover:text-gold hover:bg-gold/10",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
