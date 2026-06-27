"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  { label: "콘텐츠", links: [
    { href: "/admin/programs", label: "프로그램" },
    { href: "/admin/events", label: "이벤트" },
    { href: "/admin/special-pages", label: "특수페이지" },
  ]},
  { label: "구조", links: [
    { href: "/admin/seasons", label: "시즌" },
    { href: "/admin/blind-structures", label: "블라인드 스트럭처" },
  ]},
  { label: "사이트 설정", links: [
    { href: "/admin/online-league", label: "온라인 리그" },
    { href: "/admin/settings", label: "설정" },
  ]},
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="flex-1 px-2 py-4">
      {NAV_GROUPS.map((group) => (
        <section key={group.label} className="mb-5 last:mb-0">
          <h2 className="text-muted-foreground px-3 text-2xs font-semibold uppercase tracking-wider">
            {group.label}
          </h2>
          <ul className="mt-1 space-y-0.5">
            {group.links.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Button
                    asChild
                    variant="ghost"
                    className={
                      active
                        ? "bg-muted text-foreground border-primary w-full justify-start border-l-2"
                        : "text-muted-foreground hover:text-foreground w-full justify-start"
                    }
                  >
                    <Link href={href} aria-current={active ? "page" : undefined}>
                      {label}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
