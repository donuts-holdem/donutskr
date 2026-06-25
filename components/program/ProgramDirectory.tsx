"use client";
import { useState, useMemo } from "react";
import type { Program } from "@/lib/types";
import { ProgramList } from "./ProgramList";
import { PartnerList } from "./PartnerList";

const CATS = [
  { key: "all", label: "전체" },
  { key: "poker", label: "♠️ 포커" },
  { key: "social", label: "🤝 소셜" },
  { key: "others", label: "✨ 기타" },
];

// Single-page program directory: category chips filter the list in place (no
// navigation / URL change). initialCategory seeds the filter from ?category= so
// deep links and the /poker·/social·/others redirects still land pre-filtered.
export function ProgramDirectory({
  programs,
  partners,
  initialCategory = "all",
}: {
  programs: Program[];
  partners: Program[];
  initialCategory?: string;
}) {
  const [cat, setCat] = useState(
    CATS.some((c) => c.key === initialCategory) ? initialCategory : "all"
  );

  const filtered = useMemo(
    () => (cat === "all" ? programs : programs.filter((p) => p.program_group === cat)),
    [programs, cat]
  );

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {CATS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCat(c.key)}
            aria-pressed={cat === c.key}
            className={`shrink-0 px-4 py-2 rounded-pill text-sm font-medium border transition-colors cursor-pointer ${
              cat === c.key
                ? "bg-gold/15 border-gold/40 text-gold"
                : "bg-glass border-border text-ink/60 hover:text-ink hover:border-gold/30"
            }`}
          >
            {c.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0">
          <ProgramList programs={filtered} />
        </div>
        {partners.length > 0 && (
          <div className="w-full lg:w-56 shrink-0">
            <PartnerList partners={partners} />
          </div>
        )}
      </div>
    </div>
  );
}
