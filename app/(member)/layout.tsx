import type { Metadata } from "next";
import Link from "next/link";
import { MemberNav } from "@/components/membership/MemberNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-bg pb-28 font-editorial text-ink">
    <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-border px-5 py-5 sm:px-8">
      <Link href="/home" className="py-2 text-xl font-bold tracking-tight text-gold focus-visible:outline-2 focus-visible:outline-gold">DO:NUTS <span className="text-ink">CLASS</span></Link>
      <Link href="/" className="py-3 text-xs text-ink/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-gold">공개 사이트</Link>
    </header>
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>
    <MemberNav />
  </div>;
}
