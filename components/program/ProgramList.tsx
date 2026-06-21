"use client";

import { useState, useMemo } from "react";
import type { Program } from "@/lib/types";
import { ProgramCard } from "./ProgramCard";

interface ProgramListProps {
  programs: Program[];
  showSearch?: boolean;
}

export function ProgramList({ programs, showSearch = true }: ProgramListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q) ||
      (p.location ?? "").toLowerCase().includes(q)
    );
  }, [programs, query]);

  return (
    <div className="flex flex-col gap-4">
      {showSearch && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="프로그램 검색..."
            className="w-full bg-glass border border-border rounded-pill pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink/30 outline-none focus:border-gold/50 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/80 transition-colors text-xs"
              aria-label="검색 초기화"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-ink/40 text-sm">
          {query ? `"${query}" 에 해당하는 프로그램이 없습니다.` : "프로그램이 없습니다."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}

      {query && filtered.length > 0 && (
        <p className="text-xs text-ink/30 text-right">
          {filtered.length}개의 프로그램
        </p>
      )}
    </div>
  );
}
