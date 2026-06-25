import Link from "next/link";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";
import type { Program } from "@/lib/types";
import {
  programStatusLabel,
  isOpenStatus,
  formatDotDate,
  programHref,
  PROGRAM_CATEGORIES,
} from "@/lib/program-display";
import { Reveal } from "./Reveal";
import { ScrollProgress } from "./ScrollProgress";

/* ------------------------------------------------------------------ *
 * HomeMagazine — a dark editorial "magazine" home, in the spirit of
 * conway.world but on DO:NUTS' existing warm-dark palette. The feel
 * comes from structure, not decoration: an oversized thesis hero, an
 * asymmetric featured grid with large imagery, a big type section
 * break, generous whitespace, and gold hairline accents.
 *
 * Type pairing (the signature): Pretendard for Korean headlines/body,
 * Space Grotesk for Latin display, numerals, labels and meta — so all
 * quantities read like a club's live board.
 * ------------------------------------------------------------------ */

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const PRETENDARD = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

/* ----------------------------- icons ----------------------------- */
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
const IconArrow = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M5 12h14 M13 6l6 6-6 6" />
);
const IconImage = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M21 16l-4.5-4.5L7 19" />
);

/* --------------------------- primitives -------------------------- */
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
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/55">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: open ? "#FFE58A" : "rgba(255,255,255,0.25)" }}
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
    <div className="flex h-full w-full items-center justify-center bg-[#1A1715]">
      <IconImage size={28} className="text-white/15" />
    </div>
  );
}

function MetaRow({ program }: { program: Program }) {
  return (
    <div className={`${display.className} flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] tabular-nums text-white/45`}>
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

/* ----------------------------- cards ----------------------------- */
function FeaturedCard({ program }: { program: Program }) {
  return (
    <ProgramLink
      program={program}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141211] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color] duration-300 hover:border-white/[0.20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE58A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908] motion-reduce:transition-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Cover program={program} sizes="(min-width:1024px) 64vw, 100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" aria-hidden="true" />
        <span className={`${display.className} absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm`}>
          추천
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className={`${display.className} min-w-0 truncate text-[12px] font-medium uppercase tracking-[0.1em] text-[#FFE58A]/80`}>
            {categoryLabel(program)}
          </span>
          <span className="shrink-0"><StatusDot status={program.status} /></span>
        </div>
        <h3 className="text-pretty text-[26px] font-bold leading-[1.12] tracking-[-0.025em] text-white sm:text-[32px]">
          {program.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <MetaRow program={program} />
          <IconArrow size={18} className="shrink-0 text-white/30 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-[#FFE58A] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </div>
      </div>
    </ProgramLink>
  );
}

function StandardCard({ program }: { program: Program }) {
  return (
    <ProgramLink
      program={program}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#141211] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color] duration-200 hover:border-white/[0.20] hover:bg-[#1A1715] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE58A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908] motion-reduce:transition-none"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.08]">
        <Cover program={program} sizes="(min-width:1024px) 32vw, (min-width:640px) 48vw, 100vw" />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`${display.className} min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.1em] text-white/45`}>
            {categoryLabel(program)}
          </span>
          <span className="shrink-0"><StatusDot status={program.status} /></span>
        </div>
        <h3 className="line-clamp-2 text-pretty text-[16px] font-semibold leading-snug tracking-[-0.015em] text-white/95 transition-colors duration-200 group-hover:text-white motion-reduce:transition-none sm:text-[17px]">
          {program.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <MetaRow program={program} />
          <IconArrow size={15} className="shrink-0 text-white/25 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-[#FFE58A] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </div>
      </div>
    </ProgramLink>
  );
}

function CompactCard({ program }: { program: Program }) {
  return (
    <ProgramLink
      program={program}
      className="group flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#141211] p-3 transition-[border-color,background-color] duration-200 hover:border-white/[0.20] hover:bg-[#1A1715] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE58A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908] motion-reduce:transition-none"
    >
      <div className="relative h-[68px] w-[88px] shrink-0 overflow-hidden rounded-lg border border-white/[0.08]">
        <Cover program={program} sizes="88px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`${display.className} truncate text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/40`}>
          {categoryLabel(program)}
        </span>
        <h3 className="line-clamp-2 text-pretty text-[14px] font-semibold leading-snug tracking-[-0.01em] text-white/95 transition-colors duration-200 group-hover:text-white motion-reduce:transition-none">
          {program.title}
        </h3>
        <MetaRow program={program} />
      </div>
      <IconArrow size={15} className="shrink-0 text-white/20 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-[#FFE58A] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
    </ProgramLink>
  );
}

/* ------------------------- section header ------------------------ */
function SectionHead({
  eyebrow,
  title,
  href,
  hrefLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
      <div className="flex flex-col gap-1.5">
        <span className={`${display.className} text-[11px] font-medium uppercase tracking-[0.22em] text-[#FFE58A]/80`}>
          {eyebrow}
        </span>
        <h2 className="text-[26px] font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-[34px]">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className={`${display.className} group inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-[#FFE58A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE58A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908] rounded-sm`}
        >
          {hrefLabel ?? "전체 보기"}
          <IconArrow size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      )}
    </div>
  );
}

/* ============================== view ============================= */
export function HomeMagazine({
  programs,
  hotPrograms,
  signupLink,
}: {
  programs: Program[];
  hotPrograms: Program[];
  signupLink?: string | null;
}) {
  const featPool = hotPrograms.length > 0 ? hotPrograms : programs;
  const featured = featPool[0];
  const side = featPool.slice(1, 4);
  const grid = programs.slice(0, 6);

  return (
    <div
      className="flex flex-col text-white touch-manipulation"
      style={{ fontFamily: PRETENDARD }}
    >
        <ScrollProgress />
        {/* ---------------------------- HERO ---------------------------- */}
        <section className="relative ml-[calc(50%-50vw)] flex min-h-[78vh] w-screen flex-col justify-center overflow-hidden">
          {/* Full-bleed background photo with an overall dim */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <Image
              src="/hero.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            {/* full gray scrim over the whole photo so the copy reads clearly */}
            <div className="absolute inset-0 bg-[#0A0908]/70" />
            {/* feather top & bottom to connect with the header and next section */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0A0908] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0A0908] to-transparent" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl px-4">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-9 py-24 text-center sm:gap-11 lg:max-w-3xl">
          <Reveal className="flex flex-col items-center gap-6 sm:gap-7">
            <span className={`${display.className} text-[15px] font-semibold uppercase tracking-[0.3em] text-[#FFE58A] sm:text-[19px]`}>
              DO:NUTS Poker Club
            </span>
            <h1 className="text-pretty text-[clamp(2.75rem,6.5vw,5.5rem)] font-extrabold leading-[1.0] tracking-[-0.04em] text-white">
              포커, 그 이상의
              <br />
              커뮤니티.
            </h1>
            <p className="max-w-2xl text-[17px] leading-relaxed text-white/55 sm:text-[20px]">
              토너먼트부터 소셜 게임까지 — 매주 새로운 판이 열리는 곳.
            </p>
          </Reveal>

          <Reveal delay={120} className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/programs"
              className={`${display.className} group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-bold uppercase tracking-[0.04em] text-[#0A0908] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#FFE58A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE58A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908] motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
            >
              프로그램 둘러보기
              <IconArrow size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            {signupLink && (
              <a
                href={signupLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${display.className} inline-flex items-center rounded-full border border-white/15 px-5 py-3 text-[14px] font-bold uppercase tracking-[0.04em] text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE58A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908]`}
              >
                가입 신청
              </a>
            )}
          </Reveal>
          </div>
          </div>
        </section>

        {/* -------------------------- FEATURED -------------------------- */}
        {featured && (
          <section className="flex flex-col gap-8 pb-28 sm:pb-32">
            <Reveal>
              <SectionHead
                eyebrow="Featured"
                title="지금 주목할 프로그램"
                href="/programs"
              />
            </Reveal>
            <Reveal className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <FeaturedCard program={featured} />
              </div>
              <div className="flex flex-col gap-4">
                {side.length > 0 ? (
                  side.map((p) => <CompactCard key={p.id} program={p} />)
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-[13px] text-white/40">
                    더 많은 프로그램이 곧 열려요.
                  </div>
                )}
              </div>
            </Reveal>
          </section>
        )}

        {/* ----------------------- BIG TYPE BREAK ----------------------- */}
        <Reveal as="section" className="flex flex-col gap-7 border-y border-white/[0.08] py-28 sm:py-40">
          <p className={`${display.className} text-[11px] font-medium uppercase tracking-[0.28em] text-[#FFE58A]/80 sm:text-[12px]`}>
            Poker · Social · &amp; More
          </p>
          <p className="text-balance text-[40px] font-extrabold leading-[1.02] tracking-[-0.04em] text-white sm:text-[72px] lg:text-[88px]">
            매주, 새로운 판이
            <br />
            <span className="text-white/35">열립니다.</span>
          </p>
          <p className="max-w-xl text-[16px] leading-relaxed text-white/50 sm:text-[18px]">
            포커 토너먼트, 소셜 전략 게임, 그리고 그 사이 어딘가. 도너츠는 매주
            다른 얼굴로 당신을 기다립니다.
          </p>
        </Reveal>

        {/* -------------------------- ALL GRID -------------------------- */}
        <section className="flex flex-col gap-8 py-24 sm:py-32">
          <Reveal>
            <SectionHead
              eyebrow="Programs"
              title="모든 프로그램"
              href="/programs"
              hrefLabel={`${programs.length} 전체`}
            />
          </Reveal>
          {grid.length === 0 ? (
            <p className="py-16 text-center text-[14px] text-white/40">
              등록된 프로그램이 없습니다.
            </p>
          ) : (
            <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((p) => (
                <StandardCard key={p.id} program={p} />
              ))}
            </Reveal>
          )}
          {programs.length > grid.length && (
            <Reveal className="flex justify-center pt-2">
              <Link
                href="/programs"
                className={`${display.className} group inline-flex items-center gap-2 rounded-full border border-white/12 px-6 py-3 text-[13px] font-medium uppercase tracking-[0.06em] text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE58A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908]`}
              >
                {programs.length - grid.length}개 프로그램 더 보기
                <IconArrow size={15} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </Reveal>
          )}
        </section>

        {/* ----------------------------- CTA ---------------------------- */}
        {signupLink && (
          <Reveal as="section" className="mb-20 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#141211] px-8 py-14 text-center sm:px-12 sm:py-20">
            <p className={`${display.className} mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#FFE58A]`}>
              Join the table
            </p>
            <h2 className="text-balance text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-[52px]">
              다음 판에서 만나요.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
              가입 신청 한 번이면 도너츠의 모든 프로그램에 함께할 수 있어요.
            </p>
            <a
              href={signupLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`${display.className} group mt-8 inline-flex items-center gap-2 rounded-full bg-coral-cta px-6 py-3.5 text-[14px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_12px_40px_-12px_rgba(217,75,69,0.7)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908] motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
            >
              가입 신청하기
              <IconArrow size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </a>
          </Reveal>
        )}
    </div>
  );
}
