"use client";

import { useState } from "react";
import type { Event } from "@/lib/types";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { CalendarView } from "@/components/schedule/CalendarView";
import { display } from "@/components/schedule/fixtures";

const PRETENDARD = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

type Mode = "list" | "calendar";

/* Inline icons (bespoke SVGs, matching fixtures.tsx) */
function IconList({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
      <path d="M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01" />
    </svg>
  );
}
function IconCalendar({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3v3 M17 3v3 M4 8h16 M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

const MODES: { key: Mode; label: string; Icon: typeof IconList }[] = [
  { key: "list", label: "리스트", Icon: IconList },
  { key: "calendar", label: "캘린더", Icon: IconCalendar },
];

export function ScheduleView({
  events,
  upcoming,
  past,
  today,
  initialMode = "list",
  initialTab = "upcoming",
  initialMonth,
}: {
  events: Event[];
  upcoming: Event[];
  past: Event[];
  today: string;
  initialMode?: Mode;
  initialTab?: "upcoming" | "past";
  initialMonth: string;
}) {
  const [mode, setModeState] = useState<Mode>(initialMode === "calendar" ? "calendar" : "list");

  function setMode(value: Mode) {
    setModeState(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value === "list") url.searchParams.delete("view");
    else url.searchParams.set("view", value);
    window.history.replaceState(null, "", url);
  }

  return (
    <div
      className="flex flex-col gap-8 py-12 text-white touch-manipulation sm:py-16"
      style={{ fontFamily: PRETENDARD }}
    >
      {/* Header — title block left, mode switch top-right (one pill per altitude;
          the list's own 예정/지난 control lives inside ScheduleBoard). */}
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className={`${display.className} text-2xs font-medium uppercase tracking-[0.22em] text-gold/80`}>
            Schedule
          </span>
          <h1 className="text-balance text-display-lg font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-display-2xl">
            일정
          </h1>
          <p className="text-sm text-white/50">DO:NUTS 포커 시리즈의 토너먼트와 이벤트 일정입니다.</p>
        </div>

        {/* List / Calendar switcher */}
        <div role="tablist" aria-label="일정 보기 방식" className="inline-flex shrink-0 self-start rounded-pill bg-surface p-1">
          {MODES.map(({ key, label, Icon }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(key)}
                className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none ${
                  active ? "bg-white/[0.10] text-white" : "text-white/45 hover:text-white/80"
                }`}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>
      </header>

      {mode === "calendar" ? (
        <CalendarView events={events} today={today} initialMonth={initialMonth} />
      ) : (
        <ScheduleBoard upcoming={upcoming} past={past} initialTab={initialTab} />
      )}
    </div>
  );
}
