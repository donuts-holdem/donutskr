import type { Metadata } from "next";
import Link from "next/link";
import { MemberNav } from "@/components/membership/MemberNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-bg pb-28 font-editorial text-ink">
    <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-border px-5 py-5 sm:px-8">
      <Link href="/home" className="py-2 text-xl font-bold tracking-tight text-gold focus-visible:outline-2 focus-visible:outline-gold">DO:NUTS <span className="text-ink">CLASS</span></Link>
      <nav aria-label="회원 서비스" className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs">
        {[{ href: "/learn", label: "학습" }, { href: "/meetings", label: "모임" }, { href: "/notifications", label: "알림" }, { href: "/", label: "공개 사이트" }].map(link => <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center text-ink/70 hover:text-gold focus-visible:outline-2 focus-visible:outline-gold">{link.label}</Link>)}
      </nav>
    </header>
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>
    <MemberNav />
  </div>;
}
