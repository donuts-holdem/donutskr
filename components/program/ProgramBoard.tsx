"use client";

import { useMemo, useState } from "react";
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

/* ------------------------------------------------------------------ *
 * ProgramBoard — the full programs directory, set in the SAME visual
 * language as the magazine home (HomeMagazine): Pretendard for Korean
 * headlines/body, Space Grotesk for Latin display, labels, and the
 * live data line, with gold hairline accents on the warm-dark palette.
 *
 * What it adds over home is function, not a new look: a category
 * filter, a search field, and a live "standings" header — all dressed
 * in the home vocabulary so the two pages read as one product.
 * ------------------------------------------------------------------ */

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const PRETENDARD = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

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
// Filled spade — the club's mark on a recommended program. Decorative; the
// badge's "추천" text carries the meaning for assistive tech.
const IconSpade = ({ size = 12, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12 2C9 6 4 8.5 4 13a4 4 0 0 0 6.8 2.9C10.6 18 9.7 19.6 8 20.5v.5h8v-.5c-1.7-.9-2.6-2.5-2.8-4.6A4 4 0 0 0 20 13c0-4.5-5-7-8-11z" />
  </svg>
);

/* --------------------------- primitives -------------------------- */

// Wraps card content in the correct anchor type per programHref.
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

// Status tag — mirrors HomeMagazine's EventStatusTag: an open program reads
// in gold (dot + label), a closed one stays neutral.
function StatusDot({ status }: { status: string | null }) {
  const label = programStatusLabel(status);
  if (!label) return null;
  const open = isOpenStatus(status);
  return (
    <span
      className={`${display.className} inline-flex items-center gap-1.5 text-xs font-medium ${
        open ? "text-gold" : "text-white/45"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${open ? "bg-gold" : "bg-white/25"}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function Cover({ program, sizes }: { program: Program; sizes: string }) {
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
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-hover">
      <IconImage size={26} className="text-white/15" />
    </div>
  );
}

function MetaRow({ program }: { program: Program }) {
  return (
    <div
      className={`${display.className} flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm tabular-nums text-white/65`}
    >
      {program.member_count > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <IconUsers size={15} className="text-white/45" />
          {program.member_count.toLocaleString()}
        </span>
      )}
      {program.start_date && (
        <span className="inline-flex items-center gap-1.5">
          <IconDate size={15} className="text-white/45" />
          {formatDotDate(program.start_date)}
        </span>
      )}
      {program.location && (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <IconPin size={15} className="shrink-0 text-white/45" />
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

/* ----------------------------- card ------------------------------ */
// Matches HomeMagazine's StandardCard exactly so the grid reads identically.
function ProgramCardItem({ program }: { program: Program }) {
  return (
    <ProgramLink
      program={program}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color] duration-200 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none ${
        program.is_hot
          ? "border-gold/45 hover:border-gold/70"
          : "border-white/[0.08] hover:border-white/[0.20]"
      }`}
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.08]">
        <Cover program={program} sizes="(min-width:1024px) 32vw, (min-width:640px) 48vw, 100vw" />
        {program.is_hot && (
          <span
            className={`${display.className} absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-bg shadow-sm`}
          >
            <IconSpade size={12} className="text-bg" />
            추천
          </span>
        )}
      </div>

      <div className="flex flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`${display.className} min-w-0 truncate text-xs font-medium uppercase tracking-[0.1em] text-white/65`}
          >
            {categoryLabel(program)}
          </span>
          <span className="shrink-0">
            <StatusDot status={program.status} />
          </span>
        </div>

        <h3 className="mt-1 line-clamp-2 text-pretty text-xl font-semibold leading-snug tracking-[-0.015em] text-white/95 transition-colors duration-200 group-hover:text-white motion-reduce:transition-none">
          {program.title}
        </h3>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <MetaRow program={program} />
          <IconArrow
            size={15}
            className="shrink-0 text-white/25 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-gold motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
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
    return programs
      .filter((p) => {
        if (cat !== "all" && p.program_group !== cat) return false;
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.location ?? "").toLowerCase().includes(q)
        );
      })
      // Recommended programs lead the list; sort is stable, so the existing
      // sort_order is preserved within the hot and non-hot groups.
      .sort((a, b) => Number(b.is_hot) - Number(a.is_hot));
  }, [programs, cat, query]);

  return (
    <div
      className="flex flex-col gap-10 py-12 text-white touch-manipulation sm:gap-12 sm:py-16"
      style={{ fontFamily: PRETENDARD }}
    >
      {/* Header — eyebrow + display title, matching HomeMagazine's
          SectionHead vocabulary. */}
      <header className="flex flex-col gap-3 border-b border-white/[0.08] pb-7">
        <span
          className={`${display.className} text-2xs font-medium uppercase tracking-[0.22em] text-gold/80`}
        >
          Programs
        </span>
        <h1 className="text-balance text-display-lg font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-display-2xl">
          프로그램
        </h1>
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none ${
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
            placeholder="원하는 프로그램을 검색해보세요"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full rounded-full border border-white/[0.08] bg-surface py-2.5 pl-9 pr-4 text-sm text-white transition-colors duration-150 placeholder:text-white/35 hover:border-white/[0.14] focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/30 motion-reduce:transition-none"
          />
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-surface py-20 text-center">
          <p className="text-sm font-medium text-white/80">
            {query
              ? `“${query}”에 맞는 프로그램이 없어요.`
              : "이 카테고리엔 아직 열린 프로그램이 없어요."}
          </p>
          <p className="text-sm text-white/45">
            다른 검색어나 카테고리를 골라보세요.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-4">
            <h2 className="text-sm font-medium text-white/55">
              {cat === "all"
                ? "전체"
                : PROGRAM_CATEGORIES.find((c) => c.key === cat)?.label}
            </h2>
            <span className={`${display.className} text-xs tabular-nums text-white/35`}>
              {filtered.length}
            </span>
          </div>
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProgramCardItem key={p.id} program={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
