import Link from "next/link";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";
import type { Event, Season } from "@/lib/legacy/types";
import { FixtureRow } from "@/components/schedule/fixtures";
import { Reveal } from "@/components/site/Reveal";

/* ------------------------------------------------------------------ *
 * SeriesBoard — the season landing page. It mirrors the home board's
 * editorial language: a left-aligned thesis hero (season badge +
 * display masthead with the year set in gold + the champion bracelet
 * bleeding off the right edge), followed by fixtures and participation details.
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

/* The season landing leads with what's next, so the fixture board shows a
   short preview of upcoming events and hands off to the full /schedule. */
const FIXTURE_PREVIEW_LIMIT = 6;

/* Participation guide — static, restrained copy in a members'-club register.
   No gambling language: the sequence is the club's operating rhythm, from
   picking an event to participating at the venue. */
const JOIN_STEPS = [
  {
    title: "일정 확인",
    desc: "시리즈 일정에서 참가할 토너먼트와 이벤트를 고릅니다.",
  },
  {
    title: "참가 신청",
    desc: "이벤트별 신청 링크로 좌석을 미리 예약합니다.",
  },
  {
    title: "현장 등록",
    desc: "레지스트레이션 마감 전 도착해 바이인 등록을 마칩니다.",
  },
  {
    title: "시리즈 참여",
    desc: "현장 운영진의 안내에 따라 토너먼트와 이벤트에 참여합니다.",
  },
] as const;

/* Shared section header — an English eyebrow over a Korean masthead, the
   editorial pattern the home board and /schedule already speak. */
function SectionHead({
  id,
  eyebrow,
  title,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
      <div className="flex flex-col gap-2">
        <span
          className={`${display.className} text-2xs font-medium uppercase tracking-[0.22em] text-gold/80`}
        >
          {eyebrow}
        </span>
        <h2
          id={id}
          className="text-display-sm font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-display-lg"
        >
          {title}
        </h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className={`${display.className} group inline-flex shrink-0 items-center gap-1.5 rounded-sm text-xs font-medium uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
        >
          {action.label}
          <IconArrow
            size={14}
            className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      )}
    </div>
  );
}

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

export function SeriesBoard({
  season,
  events = [],
  signupLink,
  signupLabel,
  signupNewTab,
}: {
  season: Season | null;
  events?: Event[];
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

  const fixtures = events.slice(0, FIXTURE_PREVIEW_LIMIT);

  return (
    <div
      className="flex flex-col text-white touch-manipulation"
      style={{ fontFamily: PRETENDARD }}
    >
      {/* ---------------------------- HERO ---------------------------- */}
      <section className="relative overflow-hidden">
        {/* Ambient gold bloom anchoring the masthead. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute right-0 top-1/2 h-[560px] w-[560px] -translate-y-1/2 translate-x-1/3 rounded-full bg-gold/[0.06] blur-3xl" />
        </div>

        {/* Champion bracelet, anchored to the layout's right edge with faded sides. */}
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
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bg to-transparent" />
          </div>
        )}

        <div className="relative">
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

      {/* ---------------------- CURRENT-SEASON FIXTURES --------------- */}
      <section
        aria-labelledby="series-fixtures"
        className="flex flex-col gap-8 pb-16 sm:pb-20"
      >
        <Reveal>
          <SectionHead
            id="series-fixtures"
            eyebrow="Fixtures"
            title="이번 시즌 이벤트"
            action={{ href: "/schedule", label: "전체 일정" }}
          />
        </Reveal>

        {fixtures.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center gap-2 rounded-card border border-white/[0.08] bg-surface py-20 text-center">
              <p className="text-sm font-medium text-white/80">
                예정된 이벤트가 준비 중입니다.
              </p>
              <p className="text-sm text-white/45">
                새 시즌 일정이 확정되면 이곳에 가장 먼저 공개됩니다.
              </p>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <ul role="list" className="flex flex-col">
              {fixtures.map((event) => (
                <FixtureRow key={event.id} event={event} />
              ))}
            </ul>
          </Reveal>
        )}
      </section>

      {/* ------------------------ PARTICIPATION GUIDE ----------------- */}
      <section
        aria-labelledby="series-join"
        className="flex flex-col gap-8 pb-16 sm:pb-20"
      >
        <Reveal>
          <SectionHead
            id="series-join"
            eyebrow="How to Join"
            title="참여 안내"
          />
        </Reveal>

        <Reveal>
          {/* Hairline-divided register, not floating cards: the steps read as
              one connected sequence. gap-px over bg-border draws the rules. */}
          <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {JOIN_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex flex-col gap-3 bg-surface p-6 sm:p-7"
              >
                <span
                  className={`${display.className} text-2xl font-bold tabular-nums leading-none tracking-[-0.02em] text-gold`}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold tracking-[-0.01em] text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/55">
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>

        {signupLink && (
          <Reveal className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <a
              href={signupLink}
              target={signupNewTab ? "_blank" : undefined}
              rel={signupNewTab ? "noopener noreferrer" : undefined}
              className="group inline-flex items-center gap-2 rounded-pill bg-coral-cta px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_36px_-14px_rgba(217,75,69,0.75)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {signupLabel ?? "가입 신청하기"}
              <IconArrow
                size={16}
                className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </a>
            <p className="text-sm text-white/45">
              첫 참가 전 시즌 멤버십 신청이 필요합니다.
            </p>
          </Reveal>
        )}
      </section>

    </div>
  );
}
