import Link from "next/link";
import Image from "next/image";
import { HeaderNav } from "@/components/site/HeaderNav";
import { PUBLIC_NAVIGATION } from "@/lib/navigation";

export function Header() {
  return (
    <header className="bg-bg border-b border-border sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" aria-label="DO:NUTS 홈" className="shrink-0">
          <Image
            src="/logo-v3.png"
            alt="DO:NUTS"
            width={497}
            height={118}
            priority
            className="h-8 w-auto"
          />
        </Link>

        {/* Primary navigation (client island — highlights the active route) */}
        <HeaderNav links={PUBLIC_NAVIGATION} />
      </div>
    </header>
  );
}
