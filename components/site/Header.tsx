import Link from "next/link";
import Image from "next/image";
import { getSiteConfig } from "@/lib/data/siteConfig";

const NAV_LINKS = [
  { label: "프로그램", href: "/programs" },
  { label: "시리즈", href: "/series" },
  { label: "일정", href: "/schedule" },
  { label: "리더보드", href: "/leaderboard" },
  { label: "온라인 리그", href: "/online-league" },
  { label: "챌린지", href: "/challenge" },
];

export async function Header() {
  const config = await getSiteConfig();

  return (
    <header className="bg-bg border-b border-border sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" aria-label="DO:NUTS 홈" className="shrink-0">
          <Image
            src="/logo-v2.webp"
            alt="DO:NUTS"
            width={40}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </Link>

        {/* Primary navigation */}
        <nav
          aria-label="주요 메뉴"
          className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex-shrink-0 px-3 py-2 text-sm font-medium text-ink/60 hover:text-gold transition-colors rounded-pill hover:bg-gold/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Signup CTA */}
        {config.signup_link && (
          <a
            href={config.signup_link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 px-3.5 py-2 text-sm font-semibold text-gold hover:text-gold/80 transition-colors rounded-pill hover:bg-gold/10"
          >
            가입신청
          </a>
        )}
      </div>
    </header>
  );
}
