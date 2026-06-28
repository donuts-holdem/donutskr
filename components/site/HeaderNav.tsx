"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "프로그램", href: "/programs" },
  { label: "일정", href: "/schedule" },
  { label: "시리즈", href: "/series" },
  { label: "리더보드", href: "/leaderboard" },
  { label: "온라인 리그", href: "/online-league" },
  { label: "챌린지", href: "/challenge" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function HeaderNav() {
  // Match the section, including detail routes (e.g. /schedule/[id] → 일정).
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // While open: lock body scroll, close on Escape, focus the close button.
  // (The drawer also closes on link click — see onClick below.)
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      // Return focus to the trigger for keyboard users.
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      {/* Desktop: inline nav */}
      <nav
        aria-label="주요 메뉴"
        className="hidden items-center gap-1 md:flex"
      >
        {NAV_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
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

      {/* Mobile: hamburger trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="text-ink/70 hover:text-gold hover:bg-gold/10 ml-auto rounded-pill p-2 transition-colors md:hidden"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile: full-screen menu (portal) */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="주요 메뉴"
            className="bg-bg animate-in fade-in-0 fixed inset-0 z-50 flex flex-col duration-150 md:hidden"
          >
            <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4">
              <span className="text-gold text-sm font-bold tracking-wide">
                메뉴
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="text-ink/70 hover:text-gold hover:bg-gold/10 rounded-pill p-2 transition-colors"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <nav
              aria-label="주요 메뉴"
              className="flex flex-col gap-1 overflow-y-auto px-4 py-4"
            >
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-card px-4 py-3 text-lg font-semibold transition-colors",
                      active
                        ? "text-gold bg-gold/10"
                        : "text-ink/80 hover:text-gold hover:bg-gold/10",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
