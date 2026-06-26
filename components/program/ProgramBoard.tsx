"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import type { Program } from "@/lib/types";
import {
  programStatusLabel,
  isOpenStatus,
  formatDotDate,
  programHref,
  PROGRAM_CATEGORIES,
} from "@/lib/program-display";

/* ------------------------------------------------------------------ *
 * ProgramBoard — a Vercel/Linear-grade programs directory.
 * Restraint-first and near-monochrome: a WARM neutral-dark ramp,
 * hairline borders with a faint inner top-highlight for elevation,
 * an 8px spacing rhythm. The only colour is a refined brand amber,
 * spent sparingly (live stats, open-status dot, focus rings, hover).
 *
 * Signature: a MONO DATA SYSTEM — every quantity (live stats, member
 * counts, dates, totals) is set in Geist Mono, so the directory reads
 * like a club's live standings board. Type carries the personality;
 * there is no decoration. Geist (UI) pairs with Geist Mono (data).
 * ------------------------------------------------------------------ */

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/* --- palette (Tailwind arbitrary values) ---------------------------
 * page     #0B0A09   warm backdrop
 * surface  #141211   base card / panel / input
 * raised   #1A1715   hover
 * line     rgba(255,255,255,0.08)   hairline
 * text-1   #F7F6F3   primary (warm white)
 * text-2   rgba(255,255,255,0.60)   secondary
 * text-3   rgba(255,255,255,0.42)   tertiary / meta
 * accent   #E7B45A   refined brand amber — used sparingly only
 */
const ACCENT = "#E7B45A";

/* ----------------------------- icons ----------------------------- */

function Line({
  d,
  size = 14,
  className,
}: {
  d: string;
  size?: number;
  className?: string;
}) {
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
  <Line
    {...p}
    d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19 M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4 M15 5.2a3 3 0 0 1 0 5.6"
  />
);
const IconDate = (p: { size?: number; className?: string }) => (
  <Line
    {...p}
    d="M7 3v3 M17 3v3 M4 8h16 M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
  />
);
const IconPin = (p: { size?: number; className?: string }) => (
  <Line
    {...p}
    d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
  />
);
const IconArrow = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M5 12h14 M13 6l6 6-6 6" />
);
const IconSearch = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-4-4" />
);
const IconImage = (p: { size?: number; className?: string }) => (
  <Line
    {...p}
    d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M21 16l-4.5-4.5L7 19"
  />
);

/* --------------------------- primitives -------------------------- */

// Wraps card/partner content in the correct anchor type per programHref.
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

// Quiet status: an open program gets the amber dot; closed stays neutral.
function StatusDot({ status }: { status: string | null }) {
  const label = programStatusLabel(status);
  if (!label) return null;
  const open = isOpenStatus(status);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/60">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: open ? ACCENT : "rgba(255,255,255,0.25)" }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function Cover({
  program,
  sizes,
}: {
  program: Program;
  sizes: string;
}) {
  if (program.cover_image) {
    return (
      <Image
        src={program.cover_image}
        alt={program.title}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    );
  }
  // Quiet monochrome placeholder — no theme, no colour.
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1A1715]">
      <IconImage size={26} className="text-white/15" />
    </div>
  );
}

function MetaRow({
  program,
  className,
}: {
  program: Program;
  className?: string;
}) {
  return (
    <div
      className={`${geistMono.className} flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11.5px] tabular-nums text-white/45 ${
        className ?? ""
      }`}
    >
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

/* ----------------------------- card ------------------------------ */
function ProgramCardItem({ program }: { program: Program }) {
  return (
    <ProgramLink
      program={program}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#141211] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color] duration-200 hover:border-white/[0.20] hover:bg-[#1A1715] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B45A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0A09] motion-reduce:transition-none"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.08]">
        <Cover program={program} sizes="(min-width:1024px) 32vw, (min-width:640px) 48vw, 100vw" />
        {program.is_hot && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-md border border-white/10 bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white/85 backdrop-blur-sm">
            추천
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[12px] font-medium text-white/45">
            {program.category ?? PROGRAM_CATEGORIES.find((c) => c.key === program.program_group)?.label ?? program.program_group}
          </span>
          <span className="shrink-0">
            <StatusDot status={program.status} />
          </span>
        </div>

        <h3 className="line-clamp-2 text-pretty text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[#F7F6F3] transition-colors duration-200 group-hover:text-white motion-reduce:transition-none">
          {program.title}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <MetaRow program={program} />
          <IconArrow
            size={15}
            className="shrink-0 text-white/25 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-[#E7B45A] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
        </div>
      </div>
    </ProgramLink>
  );
}

/* ----------------------------- board ----------------------------- */
export function ProgramBoard({
  programs,
  initialCategory = "all",
}: {
  programs: Program[];
  initialCategory?: string;
}) {
  const [cat, setCatState] = useState(
    PROGRAM_CATEGORIES.some((c) => c.key === initialCategory)
      ? initialCategory
      : "all"
  );
  const [query, setQuery] = useState("");

  function setCat(key: string) {
    setCatState(key);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (key === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", key);
    window.history.replaceState(null, "", url);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((p) => {
      if (cat !== "all" && p.program_group !== cat) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [programs, cat, query]);

  const openCount = useMemo(
    () => programs.filter((p) => isOpenStatus(p.status)).length,
    [programs]
  );

  return (
    <div
      className={`${geist.className} -mx-4 min-h-screen touch-manipulation bg-[#0B0A09] px-4 py-12 text-[#F7F6F3] sm:py-16`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        {/* Header — title + a live mono "standings" line (the thesis) */}
        <header className="flex flex-col gap-4">
          <h1 className="text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#F7F6F3] sm:text-[38px]">
            프로그램
          </h1>
          <div
            className={`${geistMono.className} flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] tabular-nums text-white/45`}
          >
            <span>
              <span style={{ color: ACCENT }}>{programs.length}</span> 프로그램
            </span>
            <span className="text-white/20">/</span>
            <span>
              <span style={{ color: ACCENT }}>{openCount}</span> 모집&nbsp;중
            </span>
            <span className="text-white/20">/</span>
            <span className="text-white/40">포커 · 소셜 · 그 외</span>
          </div>
        </header>

        {/* Controls */}
        <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <nav
            aria-label="프로그램 카테고리"
            className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0"
          >
            {PROGRAM_CATEGORIES.map((c) => {
              const active = cat === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCat(c.key)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B45A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0A09] motion-reduce:transition-none ${
                    active
                      ? "bg-white/[0.10] text-white"
                      : "text-white/50 hover:bg-white/[0.05] hover:text-white/85"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </nav>

          <div className="relative lg:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35">
              <IconSearch size={15} />
            </span>
            <input
              type="search"
              name="program-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="프로그램 검색"
              placeholder="이름·지역으로 검색…"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="w-full rounded-lg border border-white/[0.08] bg-[#141211] py-2.5 pl-9 pr-3 text-[13px] text-[#F7F6F3] transition-colors duration-150 placeholder:text-white/35 hover:border-white/[0.14] focus:border-[#E7B45A]/50 focus:outline-none focus:ring-2 focus:ring-[#E7B45A]/30 motion-reduce:transition-none"
            />
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141211] py-20 text-center">
            <p className="text-[14px] font-medium text-white/80">
              {query
                ? `“${query}”에 맞는 프로그램이 없어요.`
                : "이 카테고리엔 아직 열린 프로그램이 없어요."}
            </p>
            <p className="text-[13px] text-white/45">
              다른 검색어나 카테고리를 골라보세요.
            </p>
          </div>
        ) : (
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-medium text-white/55">
                {cat === "all"
                  ? "전체"
                  : PROGRAM_CATEGORIES.find((c) => c.key === cat)?.label}
              </h2>
              <span className={`${geistMono.className} text-[12px] tabular-nums text-white/35`}>
                {filtered.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProgramCardItem key={p.id} program={p} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
