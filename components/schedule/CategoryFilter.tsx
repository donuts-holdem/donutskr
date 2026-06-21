"use client";

import { useState } from "react";
import type { Event, EventCategory } from "@/lib/types";
import { EventCard } from "@/components/schedule/EventCard";

type FilterOption = EventCategory | "all";

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: "전체", value: "all" },
  { label: "페스티벌", value: "festival" },
  { label: "확정", value: "confirmed" },
  { label: "예정", value: "upcoming" },
  { label: "완료", value: "completed" },
];

export function CategoryFilter({ events }: { events: Event[] }) {
  const [active, setActive] = useState<FilterOption>("all");

  const filtered =
    active === "all" ? events : events.filter((e) => e.category === active);

  return (
    <div className="flex flex-col gap-6">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActive(f.value)}
            className={[
              "px-4 py-1.5 rounded-pill text-sm font-medium transition-colors",
              active === f.value
                ? "bg-gold/15 text-gold"
                : "border border-border text-ink/60 hover:border-gold/40 hover:text-ink",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Event grid */}
      {filtered.length === 0 ? (
        <p className="text-ink/40 text-sm py-8 text-center">
          해당 카테고리의 이벤트가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
