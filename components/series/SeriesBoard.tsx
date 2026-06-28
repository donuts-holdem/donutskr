import Link from "next/link";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";
import type { Season } from "@/lib/types";
import { Reveal } from "@/components/home/Reveal";

/* ------------------------------------------------------------------ *
 * SeriesBoard — the season landing page. It mirrors the home board's
 * editorial language: a left-aligned thesis hero (season badge +
 * display masthead with the year set in gold + the champion bracelet
 * bleeding off the right edge), handing off to three signposts that
 * route into the season — schedule, leaderboard, online league.
 * Latin labels ride Space Grotesk; Korean copy stays on Pretendard.
 * The official-sponsor strip is the global site footer, not repeated
 * here.
 * ------------------------------------------------------------------ */

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const PRETENDARD = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

function IconArrow({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14 M13 6l6 6-6 6" />
    </svg>
  );
}

/* The three signposts into the season. Static marketing copy. */
const NAV_CARDS = [
  {
    eyebrow: "Schedule",
    title: "일정",
    desc: "매주 주말 진행되는 시리즈의 일정을 한눈에 확인합니다.",
    href: "/schedule",
    cta: "전체 일정 보기",
  },
  {
    eyebrow: "Leaderboard",
    title: "리더보드",
    desc: "시리즈의 개인별, 대학별 누적 점수 순위를 확인할 수 있습니다.",
    href: "/leaderboard",
    cta: "랭킹 확인하기",
  },
  {
    eyebrow: "Online League",
    title: "온라인 리그",
    desc: "매일 진행되는 온라인 토너먼트의 일정, 참가 방법을 안내합니다.",
    href: "/online-league",
    cta: "리그 안내 보기",
  },
] as const;

/* Render the masthead with the season year picked out in gold, the way
   the reference sets it — without hard-coding which words are highlighted. */
function Masthead({ text, year }: { text: string; year: number }) {
  const token = String(year);
  if (year && text.includes(token)) {
    const idx = text.indexOf(token);
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-gold">{token}</span>
        {text.slice(idx + token.length)}
      </>
    );
  }
  return <>{text}</>;
}

function NavCard({ card }: { card: (typeof NAV_CARDS)[number] }) {
  return (
    <Link
      href={card.href}
      className="group flex flex-col gap-3.5 rounded-card border border-border bg-surface p-6 transition-[border-color,background-color] duration-300 hover:border-white/20 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none sm:p-7"
    >
      <span
        className={`${display.className} text-2xs font-bold uppercase tracking-[0.18em] text-pink`}
      >
        {card.eyebrow}
      </span>
      <h2 className="text-display-sm font-bold leading-[1.1] tracking-[-0.02em] text-white">
        {card.title}
      </h2>
      <p className="flex-1 text-sm leading-relaxed text-white/55">{card.desc}</p>
      <span className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-white/80 transition-colors duration-300 group-hover:text-gold motion-reduce:transition-none">
        {card.cta}
        <IconArrow
          size={15}
          className="transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        />
      </span>
    </Link>
  );
}

export function SeriesBoard({
  season,
  signupLink,
  signupLabel,
  signupNewTab,
}: {
  season: Season | null;
  signupLink?: string | null;
  signupLabel?: string | null;
  signupNewTab?: boolean;
}) {
  const heroText = season?.hero_text ?? season?.name ?? "도너츠 시리즈";
  const year = season?.year ?? 0;
  const heroImage = season?.hero_image ?? null;
  const subText =
    season?.sub_text ??
    (season ? null : "새로운 시즌을 준비 중입니다. 곧 만나요!");

  return (
    <div
      className="flex flex-col text-white touch-manipulation"
      style={{ fontFamily: PRETENDARD }}
    >
      {/* ---------------------------- HERO ---------------------------- */}
      <section className="relative ml-[calc(50%-50vw)] w-screen overflow-hidden">
        {/* Ambient gold bloom anchoring the masthead. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute right-0 top-1/2 h-[560px] w-[560px] -translate-y-1/2 translate-x-1/3 rounded-full bg-gold/[0.06] blur-3xl" />
        </div>

        {/* Champion bracelet, bleeding off the right edge on wide screens. */}
        {heroImage && (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] lg:block"
            aria-hidden="true"
          >
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="58vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
          </div>
        )}

        <div className="relative mx-auto w-full max-w-7xl px-4">
          <div className="flex max-w-2xl flex-col items-start py-20 sm:py-28 lg:max-w-3xl lg:py-32">
            <Reveal immediate className="flex flex-col items-start gap-6 sm:gap-7">
              {season?.badge_text && (
                <span
                  className={`${display.className} inline-flex items-center rounded-pill border border-border bg-glass px-3.5 py-1.5 text-2xs font-bold uppercase tracking-[0.18em] text-cream/85 backdrop-blur-sm`}
                >
                  {season.badge_text}
                </span>
              )}

              <h1 className="text-pretty text-hero font-extrabold leading-[1.02] tracking-[-0.035em] text-white">
                <Masthead text={heroText} year={year} />
              </h1>

              {subText && (
                <p className="max-w-xl whitespace-pre-line text-base leading-relaxed text-white/60 sm:text-lg">
                  {subText}
                </p>
              )}
            </Reveal>

            <Reveal
              immediate
              className="mt-9 flex flex-wrap items-center gap-3 sm:mt-10"
            >
              <Link
                href="/schedule"
                className="group inline-flex items-center gap-2 rounded-pill bg-coral-cta px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_36px_-14px_rgba(217,75,69,0.75)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                일정 확인하기
                <IconArrow
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
              {signupLink && (
                <a
                  href={signupLink}
                  target={signupNewTab ? "_blank" : undefined}
                  rel={signupNewTab ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center rounded-pill border border-border bg-glass px-6 py-3.5 text-sm font-bold text-white/85 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {signupLabel ?? "가입 신청하기"}
                </a>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* -------------------------- SIGNPOSTS ------------------------- */}
      <section className="pb-20 sm:pb-28">
        <Reveal className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
          {NAV_CARDS.map((card) => (
            <NavCard key={card.href} card={card} />
          ))}
        </Reveal>
      </section>
    </div>
  );
}
