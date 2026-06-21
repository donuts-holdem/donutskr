import Link from "next/link";
import { Nav } from "./Nav";

export function Header() {
  return (
    <header className="bg-bg border-b border-border sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="text-gold font-bold text-lg tracking-wide shrink-0"
        >
          DO:NUTS
        </Link>

        {/* Category nav label + Nav */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-ink/40 hidden sm:inline shrink-0">
            카테고리별 보기
          </span>
          <Nav />
        </div>
      </div>
    </header>
  );
}
