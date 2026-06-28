import Link from "next/link";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";
import type { Event, Program } from "@/lib/types";
import {
  programStatusLabel,
  isOpenStatus,
  formatDotDate,
  programHref,
  PROGRAM_CATEGORIES,
} from "@/lib/program-display";
import { FixtureRow } from "@/components/schedule/fixtures";
import { Reveal } from "./Reveal";
import { ScrollProgress } from "./ScrollProgress";

/* ------------------------------------------------------------------ *
 * HomeMagazine — a dark editorial home for the club. The page leads
 * with a thesis hero (statement + wordmark masthead) and hands the
 * floor to the one thing that matters week to week: the schedule,
 * set as a fixture board rather than another card grid. Latin display,
 * numerals and labels use Space Grotesk so the dates read like a live
 * board; Korean copy stays on Pretendard.
 * ------------------------------------------------------------------ */

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const PRETENDARD = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

/* ----------------------------- icon ------------------------------ */
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

function Line({ d, size = 14, className }: { d: string; size?: number; className?: string }) {
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
      <path d={d} />
    </svg>
  );
}
const IconUsers = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19 M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4 M15 5.2a3 3 0 0 1 0 5.6" />
);
const IconDate = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M7 3v3 M17 3v3 M4 8h16 M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
);
const IconPin = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
);
const IconImage = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M21 16l-4.5-4.5L7 19" />
);

/* ------------------------- program cards ------------------------- */
function ProgramLink({
  program,
  className,
  children,
}: {
  program: Program;
  className?: string;
  children: React.ReactNode;
}) {
  const { href, isExternal } = programHref(program);
  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function StatusDot({ status }: { status: string | null }) {
  const label = programStatusLabel(status);
  if (!label) return null;
  const open = isOpenStatus(status);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/55">
      <span
        className={`h-1.5 w-1.5 rounded-full ${open ? "bg-gold" : "bg-white/25"}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function Cover({ program, sizes, className }: { program: Program; sizes: string; className?: string }) {
  if (program.cover_image) {
    return (
      <Image
        src={program.cover_image}
        alt={program.title}
        fill
        sizes={sizes}
        className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${className ?? ""}`}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-hover">
      <IconImage size={28} className="text-white/15" />
    </div>
  );
}

function MetaRow({ program }: { program: Program }) {
  return (
    <div className={`${display.className} flex flex-wrap items-center gap-x-3.5 gap-y-1 text-2xs tabular-nums text-white/45`}>
      {program.member_count > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <IconUsers size={13} className="text-white/30" />
          {program.member_count.toLocaleString()}
        </span>
      )}
      {program.start_date && (
        <span className="inline-flex items-center gap-1.5">
          <IconDate size={13} className="text-white/30" />
          {formatDotDate(program.start_date)}
        </span>
      )}
      {program.location && (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <IconPin size={13} className="shrink-0 text-white/30" />
          <span className="truncate">{program.location}</span>
        </span>
      )}
    </div>
  );
}

function categoryLabel(program: Program) {
  return (
    program.category ??
    PROGRAM_CATEGORIES.find((c) => c.key === program.program_group)?.label ??
    program.program_group
  );
}

function FeaturedCard({ program }: { program: Program }) {
  return (
    <ProgramLink
      program={program}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color] duration-300 hover:border-white/[0.20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Cover program={program} sizes="(min-width:1024px) 64vw, 100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" aria-hidden="true" />
        <span className={`${display.className} absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-2xs font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm`}>
          추천
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className={`${display.className} min-w-0 truncate text-xs font-medium uppercase tracking-[0.1em] text-gold/80`}>
            {categoryLabel(program)}
          </span>
          <span className="shrink-0"><StatusDot status={program.status} /></span>
        </div>
        <h3 className="text-pretty text-display-sm font-bold leading-[1.12] tracking-[-0.025em] text-white sm:text-display">
          {program.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <MetaRow program={program} />
          <IconArrow size={18} className="shrink-0 text-white/30 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-gold motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </div>
      </div>
    </ProgramLink>
  );
}

function CompactCard({ program }: { program: Program }) {
  return (
    <ProgramLink
      program={program}
      className="group flex min-h-[76px] flex-1 items-stretch gap-4 overflow-hidden rounded-xl border border-white/[0.08] bg-surface p-3 transition-[border-color,background-color] duration-200 hover:border-white/[0.20] hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none"
    >
      <div className="relative w-[96px] shrink-0 self-stretch overflow-hidden rounded-lg border border-white/[0.08]">
        <Cover program={program} sizes="96px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1">
        <span className={`${display.className} truncate text-2xs font-medium uppercase tracking-[0.1em] text-white/40`}>
          {categoryLabel(program)}
        </span>
        <h3 className="line-clamp-2 text-pretty text-sm font-semibold leading-snug tracking-[-0.01em] text-white/95 transition-colors duration-200 group-hover:text-white motion-reduce:transition-none">
          {program.title}
        </h3>
        <MetaRow program={program} />
      </div>
      <IconArrow size={15} className="shrink-0 self-center text-white/20 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-gold motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
    </ProgramLink>
  );
}

/* ============================== view ============================= */
export function HomeMagazine({
  events,
  hotPrograms,
  signupLink,
}: {
  events: Event[];
  hotPrograms: Program[];
  signupLink?: string | null;
}) {
  // The home board shows the live season — upcoming and active events,
  // not the completed archive (that lives on the full schedule page).
  const board = events
    .filter((e) => e.status !== "completed" && e.status !== "canceled")
    .slice(0, 8);

  // Recommended programs: one lead card + a side list of up to four.
  const featured = hotPrograms[0];
  const side = hotPrograms.slice(1, 5);

  return (
    <div
      className="flex flex-col text-white touch-manipulation"
      style={{ fontFamily: PRETENDARD }}
    >
      <ScrollProgress />

      {/* ---------------------------- HERO ---------------------------- */}
      <section className="relative ml-[calc(50%-50vw)] flex min-h-[58vh] w-screen flex-col justify-center overflow-hidden sm:min-h-[78vh]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-bg/70" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-bg to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-9 py-14 text-center sm:gap-11 sm:py-24 lg:max-w-3xl">
            <Reveal immediate className="flex flex-col items-center gap-6 sm:gap-7">
              <h1 className="text-pretty text-hero font-extrabold leading-[1.0] tracking-[-0.04em] text-white">
                포커, 그 이상의
                <br />
                커뮤니티.
              </h1>
              <span className={`${display.className} text-3xl font-bold tracking-[-0.03em] text-gold sm:text-5xl`}>
                DO:<span className="text-pink">NUTS</span> Poker Club
              </span>
            </Reveal>

            <Reveal immediate className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/schedule"
                className={`${display.className} group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.04em] text-bg transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
              >
                전체 일정 보기
                <IconArrow size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
              {signupLink && (
                <a
                  href={signupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${display.className} inline-flex items-center rounded-full border border-white/15 px-5 py-3 text-sm font-bold uppercase tracking-[0.04em] text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
                >
                  가입 신청
                </a>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* -------------------------- SCHEDULE -------------------------- */}
      <section id="schedule" className="flex scroll-mt-24 flex-col gap-8 py-24 sm:py-32">
        <Reveal>
          <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div className="flex flex-col gap-2">
              <span className={`${display.className} text-2xs font-medium uppercase tracking-[0.22em] text-gold/80`}>
                Schedule
              </span>
              <h2 className="text-display-sm font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-display-lg">
                이번 시즌 일정
              </h2>
            </div>
            <Link
              href="/schedule"
              className={`${display.className} group inline-flex shrink-0 items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm`}
            >
              전체 일정
              <IconArrow size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </div>
        </Reveal>

        {board.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/40">
            예정된 일정이 없습니다. 다음 시즌을 준비 중이에요.
          </p>
        ) : (
          <Reveal>
            <ul role="list" className="flex flex-col">
              {board.map((event) => (
                <FixtureRow key={event.id} event={event} />
              ))}
            </ul>
          </Reveal>
        )}
      </section>

      {/* ----------------------- FEATURED PROGRAMS -------------------- */}
      {featured && (
        <section className="flex flex-col gap-8 pb-24 sm:pb-32">
          <Reveal>
            <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex flex-col gap-2">
                <span className={`${display.className} text-2xs font-medium uppercase tracking-[0.22em] text-gold/80`}>
                  Featured
                </span>
                <h2 className="text-display-sm font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-display-lg">
                  추천 프로그램
                </h2>
              </div>
              <Link
                href="/programs"
                className={`${display.className} group inline-flex shrink-0 items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm`}
              >
                전체 보기
                <IconArrow size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </div>
          </Reveal>
          <Reveal className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FeaturedCard program={featured} />
            </div>
            <div className="flex h-full flex-col gap-4">
              {side.length > 0 ? (
                side.map((p) => <CompactCard key={p.id} program={p} />)
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/40">
                  더 많은 프로그램이 곧 열려요.
                </div>
              )}
            </div>
          </Reveal>
        </section>
      )}

    </div>
  );
}
