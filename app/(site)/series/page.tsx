import type { Metadata } from "next";
import Link from "next/link";
import { getActiveSeason } from "@/lib/data/seasons";
import { getSiteConfig } from "@/lib/data/siteConfig";

export const metadata: Metadata = {
  title: "시리즈 | DO:NUTS",
  description: "DO:NUTS 포커 시리즈",
};

const NAV_CARDS = [
  {
    title: "SCHEDULE",
    desc: "시즌 일정과 이벤트를 확인하세요",
    href: "/schedule",
    cta: "일정 보기",
  },
  {
    title: "LEADERBOARD",
    desc: "포인트 순위를 확인하세요",
    href: "/leaderboard",
    cta: "리더보드 보기",
  },
  {
    title: "ONLINE LEAGUE",
    desc: "온라인 리그에 참여하세요",
    href: "/online-league",
    cta: "온라인 리그 보기",
  },
];

export default async function SeriesPage() {
  const [season, config] = await Promise.all([getActiveSeason(), getSiteConfig()]);

  return (
    <div className="py-8 flex flex-col gap-12">

      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-6 py-12">
        {season ? (
          <>
            {season.badge_text && (
              <span className="bg-gold/15 text-gold rounded-pill px-3 py-1 text-xs font-medium">
                {season.badge_text}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-gold leading-tight max-w-2xl">
              {season.hero_text ?? season.name}
            </h1>
            {season.sub_text && (
              <p className="text-ink/60 text-lg max-w-xl">{season.sub_text}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Link
                href="/schedule"
                className="bg-coral-cta text-ink px-6 py-3 rounded-pill font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                일정 확인하기
              </Link>
              {config.signup_link && (
                <a
                  href={config.signup_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border text-ink px-6 py-3 rounded-pill font-semibold text-sm hover:border-gold transition-colors"
                >
                  가입 신청하기
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-gold leading-tight">
              DO:NUTS 시리즈
            </h1>
            <p className="text-ink/60 text-lg max-w-xl">
              새로운 시즌을 준비 중입니다. 곧 만나요!
            </p>
            <Link
              href="/schedule"
              className="bg-coral-cta text-ink px-6 py-3 rounded-pill font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              일정 확인하기
            </Link>
          </>
        )}
      </section>

      {/* Navigation cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col gap-3 p-6 rounded-card border border-border bg-glass hover:border-gold/40 transition-colors"
            >
              <h2 className="text-gold font-bold tracking-widest text-sm">
                {card.title}
              </h2>
              <p className="text-ink/60 text-sm flex-1">{card.desc}</p>
              <span className="text-xs text-ink/40 hover:text-gold transition-colors">
                {card.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Sponsor footer area */}
      {season?.footer_sponsor_visible && config.footer_sponsors.length > 0 && (
        <section className="border-t border-border pt-8">
          <p className="text-center text-xs text-ink/30 mb-4 uppercase tracking-widest">
            Sponsors
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {config.footer_sponsors.map((sponsor) => (
              <span
                key={sponsor.name}
                className="text-ink/50 text-sm font-medium"
              >
                {sponsor.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
