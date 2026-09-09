import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { MemberNav } from "@/components/membership/MemberNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-bg pb-28 font-editorial text-ink lg:pb-0">
    <Header />
    <main id="main-content" tabIndex={-1} className="mx-auto scroll-mt-20 max-w-5xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>
    <MemberNav />
  </div>;
}
