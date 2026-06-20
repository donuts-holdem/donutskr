import Link from "next/link";
import { getSiteConfig } from "@/lib/data/siteConfig";

const NAV_LINKS = [
  { label: "일정", href: "/schedule" },
  { label: "리더보드", href: "/leaderboard" },
  { label: "온라인 리그", href: "/online-league" },
  { label: "챌린지", href: "/challenge" },
];

export async function SeriesNav() {
  const config = await getSiteConfig();

  return (
    <nav className="w-full border-b border-border">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-ink/60 hover:text-gold transition-colors rounded-pill hover:bg-gold/10"
          >
            {link.label}
          </Link>
        ))}
        {config.signup_link && (
          <a
            href={config.signup_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gold hover:text-gold/80 transition-colors rounded-pill hover:bg-gold/10"
          >
            가입신청
          </a>
        )}
      </div>
    </nav>
  );
}
