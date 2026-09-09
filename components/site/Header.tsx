import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { HeaderNav } from "@/components/site/HeaderNav";
import { HeaderAccount, HeaderAccountFallback } from "@/components/site/HeaderAccount";
import { APP_NAVIGATION } from "@/lib/navigation";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg font-editorial text-ink">
      <a href="#main-content" className="sr-only rounded-pill bg-gold px-4 py-3 font-semibold text-bg focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:outline-2 focus:outline-offset-2 focus:outline-gold">본문 바로가기</a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 lg:gap-6">
        {/* Logo */}
        <Link href="/" aria-label="DO:NUTS 메인" className="flex min-h-11 shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
          <Image
            src="/logo-v3.png"
            alt="DO:NUTS"
            width={497}
            height={118}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>

        {/* Primary navigation (client island — highlights the active route) */}
        <HeaderNav links={APP_NAVIGATION} account={
          <Suspense fallback={<HeaderAccountFallback />}>
            <HeaderAccount />
          </Suspense>
        } />
      </div>
    </header>
  );
}
