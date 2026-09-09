"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERSONAL_NAVIGATION } from "@/lib/navigation";
import type { HeaderTab } from "@/lib/site/types";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

function NavigationLink({ link, pathname, mobile = false, onNavigate }: {
  link: HeaderTab;
  pathname: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const active = !link.external && isActive(pathname, link.href);
  const className = cn(
    "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    mobile ? "rounded-card px-4 py-3 text-base" : "rounded-pill px-3 py-2 text-sm",
    active ? "bg-gold/10 text-gold" : "text-ink/70 hover:bg-gold/10 hover:text-gold",
  );

  return link.external ? <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>{link.label}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (새 창)</span></a> : <Link href={link.href} aria-current={active ? "page" : undefined} onClick={onNavigate} className={className}>{link.label}</Link>;
}

function NavigationMenu({ links, pathname, account }: {
  links: HeaderTab[];
  pathname: string;
  account?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Use the rendered breakpoint rather than duplicating Tailwind widths.
    const closeWhenDesktop = () => {
      if (triggerRef.current?.getClientRects().length === 0) setOpen(false);
    };
    window.addEventListener("resize", closeWhenDesktop);
    return () => window.removeEventListener("resize", closeWhenDesktop);
  }, [open]);

  const close = () => setOpen(false);
  return <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:justify-between">
    <nav aria-label="주요 메뉴" className="hidden items-center lg:flex">
      {links.map(link => <NavigationLink key={link.href} link={link} pathname={pathname} />)}
    </nav>
    <div className="flex shrink-0 items-center">{account}</div>
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button ref={triggerRef} type="button" aria-label="메뉴 열기" className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink/70 transition-colors hover:bg-gold/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:hidden"><Menu className="size-6" aria-hidden="true" /></button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/80" />
        <Dialog.Content onEscapeKeyDown={event => {
          event.preventDefault();
          if (event.code === "Escape") close();
        }} className="fixed inset-0 z-50 flex h-svh flex-col overflow-hidden bg-bg pb-safe-bottom font-editorial text-ink outline-none">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <Dialog.Title className="text-sm font-semibold tracking-wide text-gold">전체 메뉴</Dialog.Title>
            <Dialog.Close asChild><button type="button" aria-label="메뉴 닫기" className="inline-flex size-11 items-center justify-center rounded-pill text-ink/70 transition-colors hover:bg-gold/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"><X className="size-6" aria-hidden="true" /></button></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">도너츠의 일정, 시리즈, 클래스, 클럽, 모임과 학습을 한곳에서 이용하세요.</Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <nav aria-label="주요 메뉴" className="grid grid-cols-2 gap-2">
              {links.filter(link => !link.mobileHidden).map(link => <NavigationLink key={link.href} link={link} pathname={pathname} mobile onNavigate={close} />)}
            </nav>
            <nav aria-label="내 활동" className="mt-6 grid grid-cols-2 gap-2 border-t border-border pt-6">
              {PERSONAL_NAVIGATION.map(link => <NavigationLink key={link.href} link={link} pathname={pathname} mobile onNavigate={close} />)}
            </nav>
            <div className="mt-8 rounded-card border border-border p-5">
              <p className="text-sm font-semibold">함께하는 다음 판.</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">일정과 시리즈는 누구나, 클래스와 학습은 로그인 후 이용할 수 있습니다.</p>
              <Link href="/login" onClick={close} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold focus-visible:outline-2 focus-visible:outline-gold">회원 서비스로<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
          <nav aria-label="사이트 및 계정" className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-6 py-3 text-sm text-ink/70">
            <Link href="/" onClick={close} className="inline-flex min-h-11 items-center hover:text-gold focus-visible:outline-2 focus-visible:outline-gold">도너츠 메인</Link>
            <Link href="/signup" onClick={close} className="inline-flex min-h-11 items-center hover:text-gold focus-visible:outline-2 focus-visible:outline-gold">회원가입</Link>
            <Link href="/admin" onClick={close} className="inline-flex min-h-11 items-center hover:text-gold focus-visible:outline-2 focus-visible:outline-gold">운영 관리</Link>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}

export function HeaderNav({ links, account }: { links: HeaderTab[]; account?: ReactNode }) {
  const pathname = usePathname() ?? "";
  // Reset the drawer on every route transition, including browser history.
  return <NavigationMenu key={pathname} links={links} pathname={pathname} account={account} />;
}
