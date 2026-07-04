"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dialog, Popover } from "radix-ui";
import type { Event } from "@/lib/types";
import { isPast } from "@/lib/schedule";
import { deriveEventStatus } from "@/lib/event-status";
import {
  display,
  FixtureRow,
  EventStatusTag,
  eventTime,
  ACTIVE_STATUS,
  parseEventDate,
} from "@/components/schedule/fixtures";
import {
  WEEKDAYS,
  buildMonthGrid,
  groupEventsByDate,
  addMonths,
  monthLabel,
  splitOrganizerLabel,
  type DayCell as DayCellT,
} from "@/lib/calendar";

const MAX_CHIPS = 3;

function ymParts(ym: string): [number, number] {
  const [y, m] = ym.split("-").map(Number);
  return [y, m];
}

function koWeekday(date: string): string {
  const [yy, mm, dd] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()];
}

// Upcoming / live (derived scheduled or running) reads gold; anything past or
// registration-closed reads muted.
function isEventGold(event: Event): boolean {
  return ACTIVE_STATUS.has(deriveEventStatus(event, new Date()));
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

// 기획단체 토큰이 포함된 제목: 제목 안의 단체명(위치 무관, 없으면 접두)을 골드로
// 강조하고 나머지는 일반 표기한다. 강조는 색+굵기 차이가 같은 텍스트 토큰에
// 실리므로 색상 단독 구분이 아니다. 한 줄 truncate를 위해 단일 span 안에서 흐른다.
function OrganizerTitle({ event, active = true }: { event: Event; active?: boolean }) {
  const { pre, token, post } = splitOrganizerLabel(event.title, event.organizer);
  return (
    <>
      {pre}
      {token && (
        <span className={`font-semibold ${active ? "text-gold" : "text-gold/70"}`}>{token}</span>
      )}
      {post}
    </>
  );
}

// 구글 캘린더식 퀵뷰: 셀이 좁아 한 줄에 담지 못한 정보(상태·일시·레지 마감·
// 장소·참가비·참가 링크)를 칩 클릭 시 옆에 뜨는 팝오버로 보여준다. 상세 페이지
// 이동은 팝오버 안의 "자세히 보기"로 옮겨졌다.
function EventQuickView({ event, closeAs = "popover" }: { event: Event; closeAs?: "popover" | "dialog" }) {
  const past = isPast(event);
  const derivedStatus = deriveEventStatus(event, new Date());
  const time = eventTime(event);
  const regClose = event.reg_close_time?.trim();
  const showRegClose = regClose && regClose !== "미정";
  const d = event.date?.slice(0, 10) ?? null;
  const dateLabel = d
    ? `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 (${koWeekday(d)})`
    : "날짜 미정";
  const entry = event.entry_link;
  const entryLabel = event.button_label?.trim() || "참가 신청";
  const entryCls =
    "shrink-0 rounded-pill bg-coral-cta px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70";
  // 팝오버/다이얼로그 양쪽에서 재사용되므로 닫기 버튼만 호스트에 맞게 감싼다.
  const Close = closeAs === "dialog" ? Dialog.Close : Popover.Close;
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-2 p-5 pb-4">
        <div className="min-w-0">
          <EventStatusTag status={derivedStatus} muted={past} />
          <h4 className="mt-2.5 text-base font-semibold leading-snug text-white">
            <OrganizerTitle event={event} active={!past} />
          </h4>
          <p className="mt-1.5 text-sm text-white/50">
            {dateLabel}
            {time && (
              <>
                {" · "}
                <span className="tabular-nums">{time}</span>
              </>
            )}
          </p>
        </div>
        <Close asChild>
          <button
            type="button"
            aria-label="닫기"
            className="-m-1 shrink-0 rounded-md p-1 text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </Close>
      </div>
      {(event.organizer || showRegClose || event.location || event.buy_in) && (
        <dl className="flex flex-col gap-2 border-t border-white/[0.08] px-5 py-4 text-sm">
          {event.organizer && (
            <div className="flex gap-4">
              <dt className="w-16 shrink-0 text-white/40">기획 단체</dt>
              <dd className="text-white/85">{event.organizer}</dd>
            </div>
          )}
          {showRegClose && (
            <div className="flex gap-4">
              <dt className="w-16 shrink-0 text-white/40">레지 마감</dt>
              <dd className="tabular-nums text-white/85">{regClose}</dd>
            </div>
          )}
          {event.location && (
            <div className="flex gap-4">
              <dt className="w-16 shrink-0 text-white/40">장소</dt>
              <dd className="min-w-0 text-white/85">{event.location}</dd>
            </div>
          )}
          {event.buy_in && (
            <div className="flex gap-4">
              <dt className="w-16 shrink-0 text-white/40">참가비</dt>
              <dd className="font-semibold text-gold">{event.buy_in}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] px-4 py-3.5">
        <Link
          href={`/schedule/${event.id}`}
          className="rounded-md px-1.5 py-1 text-sm text-white/60 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
        >
          자세히 보기 →
        </Link>
        {entry &&
          (/^https?:/i.test(entry) ? (
            <a href={entry} target="_blank" rel="noopener noreferrer" className={entryCls}>
              {entryLabel}
            </a>
          ) : (
            <Link href={entry} className={entryCls}>
              {entryLabel}
            </Link>
          ))}
      </div>
    </div>
  );
}

// In-cell chip: gold start time (when set) + organizer-highlighted title
// (buy-in moved off the calendar). Click opens the quick-view popover beside
// the chip. The active-status tint still dims past events.
function EventChip({ event }: { event: Event }) {
  const gold = isEventGold(event);
  const time = eventTime(event);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`block w-full overflow-hidden rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/[0.06] data-[state=open]:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
            gold ? "" : "opacity-80"
          }`}
        >
          <span className="block truncate text-xs text-white/90">
            {time && (
              <span className={`tabular-nums ${gold ? "text-gold" : "text-gold/70"}`}>{time} </span>
            )}
            <OrganizerTitle event={event} active={gold} />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-112 rounded-card border border-white/[0.14] bg-surface-raised shadow-2xl shadow-black/60 focus-visible:outline-none"
          style={{ fontFamily: '"Pretendard Variable", Pretendard, system-ui, sans-serif' }}
        >
          <EventQuickView event={event} />
          <Popover.Arrow className="fill-surface-raised" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// 데스크탑 칩 퀵뷰의 모바일 대응: 행 탭 시 같은 EventQuickView를 바텀 시트로
// 띄운다 (sm 이상에서는 중앙 카드 — 데스크탑 "+N 더 보기" 행에서도 일관 동작).
function EventQuickViewSheet({ event, children }: { event: Event; children: React.ReactNode }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-card border-t border-white/[0.14] bg-surface-raised pb-4 shadow-2xl shadow-black/60 focus-visible:outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-112 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:border sm:pb-0"
          style={{ fontFamily: '"Pretendard Variable", Pretendard, system-ui, sans-serif' }}
        >
          <Dialog.Title className="sr-only">{event.title}</Dialog.Title>
          {/* 시트 그립 (모바일 전용 어포던스) */}
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-pill bg-white/20 sm:hidden" />
          <EventQuickView event={event} closeAs="dialog" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DayEventRow({ event }: { event: Event }) {
  const past = isPast(event);
  const time = eventTime(event);
  const derivedStatus = deriveEventStatus(event, new Date());
  return (
    <li className="border-t border-white/[0.08] first:border-t-0">
      <EventQuickViewSheet event={event}>
        <button
          type="button"
          className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04] data-[state=open]:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
        >
          <span className={`${display.className} w-11 shrink-0 pt-0.5 text-xs tabular-nums ${past ? "text-white/40" : "text-gold/90"}`}>
            {time ?? "—"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-white/90">
              <OrganizerTitle event={event} active={!past} />
            </span>
            {event.location && (
              <span className="mt-0.5 block truncate text-2xs text-white/50">{event.location}</span>
            )}
          </span>
          <EventStatusTag status={derivedStatus} muted={past} />
        </button>
      </EventQuickViewSheet>
    </li>
  );
}

function OverflowPopover({
  date,
  events,
  count,
}: {
  date: string;
  events: Event[];
  count: number;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${count}개 더 보기`}
          className={`${display.className} rounded-md px-1.5 py-0.5 text-left text-2xs font-medium text-white/45 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70`}
        >
          +{count}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-80 rounded-card border border-white/[0.14] bg-surface-raised p-2 shadow-2xl shadow-black/60 focus-visible:outline-none"
          style={{ fontFamily: '"Pretendard Variable", Pretendard, system-ui, sans-serif' }}
        >
          <p className={`${display.className} px-2 py-1.5 text-2xs font-medium uppercase tracking-[0.12em] text-white/40`}>
            {Number(date.slice(5, 7))}월 {Number(date.slice(8, 10))}일 ({koWeekday(date)})
          </p>
          <ul className="flex flex-col">
            {events.map((e) => (
              <DayEventRow key={e.id} event={e} />
            ))}
          </ul>
          <Popover.Arrow className="fill-surface-raised" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function DayCell({
  cell,
  events,
  today,
  selected,
  onSelect,
  onNavigateMonth,
}: {
  cell: DayCellT;
  events: Event[];
  today: string;
  selected: boolean;
  onSelect: (date: string) => void;
  onNavigateMonth: (ym: string) => void;
}) {
  const isToday = cell.date === today;
  const visible = events.slice(0, MAX_CHIPS);
  const overflow = events.length - visible.length;
  const numClass = `${display.className} inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums`;

  if (!cell.inMonth) {
    const ym = cell.date.slice(0, 7);
    return (
      <div role="gridcell" className="min-h-20 border-b border-r border-white/[0.08] p-1.5 sm:min-h-28">
        {/* mobile: tap to jump to that month */}
        <button
          type="button"
          aria-label={`${Number(ym.slice(5, 7))}월로 이동`}
          onClick={() => onNavigateMonth(ym)}
          className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:hidden"
        >
          <span className={`${numClass} text-white/25`}>{cell.day}</span>
        </button>
        <span className={`${numClass} hidden text-white/25 sm:inline-flex`}>{cell.day}</span>
      </div>
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={`${Number(cell.date.slice(5, 7))}월 ${cell.day}일, 이벤트 ${events.length}개`}
      className="min-h-20 border-b border-r border-white/[0.08] p-1.5 sm:min-h-28"
    >
      {/* mobile: whole cell selects the day */}
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${Number(cell.date.slice(5, 7))}월 ${cell.day}일`}
        onClick={() => onSelect(cell.date)}
        className={`flex w-full flex-col items-start gap-1 rounded-md p-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:hidden ${
          selected ? "bg-white/[0.06]" : ""
        }`}
      >
        <span className={`${numClass} ${isToday ? "ring-1 ring-gold/80 text-gold" : selected ? "text-white" : "text-white/80"}`}>
          {cell.day}
        </span>
        {events.length > 0 && (
          <span className="flex gap-0.5" aria-hidden="true">
            {events.slice(0, 3).map((e) => (
              <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${isEventGold(e) ? "bg-gold" : "bg-white/30"}`} />
            ))}
          </span>
        )}
      </button>

      {/* desktop: passive number + chip links */}
      <div className="hidden flex-col sm:flex">
        <span className={`${numClass} ${isToday ? "ring-1 ring-gold/80 text-gold" : "text-white/80"}`}>{cell.day}</span>
        <div className="mt-1 flex flex-col gap-0.5">
          {visible.map((e) => (
            <EventChip key={e.id} event={e} />
          ))}
          {overflow > 0 && (
            <OverflowPopover date={cell.date} events={events} count={overflow} />
          )}
        </div>
      </div>
    </div>
  );
}

export function CalendarView({
  events,
  today,
  initialMonth,
}: {
  events: Event[];
  today: string;
  initialMonth: string;
}) {
  const [month, setMonthState] = useState(() => {
    if (typeof window !== "undefined") {
      const fromUrl = new URL(window.location.href).searchParams.get("month");
      if (fromUrl && /^\d{4}-(0[1-9]|1[0-2])$/.test(fromUrl)) return fromUrl;
    }
    return initialMonth;
  });
  const byDate = useMemo(() => groupEventsByDate(events), [events]);
  const undated = useMemo(() => events.filter((e) => !parseEventDate(e.date)), [events]);
  const [y, m] = ymParts(month);
  const weeks = useMemo(() => buildMonthGrid(y, m), [y, m]);

  const firstEventDay = (ym: string) =>
    [...byDate.keys()].filter((k) => k.startsWith(ym)).sort()[0] ?? null;
  const defaultSelected = today.startsWith(month) ? today : firstEventDay(month);
  const [selected, setSelected] = useState<string | null>(defaultSelected);

  function changeMonth(next: string) {
    setMonthState(next);
    setSelected(next === today.slice(0, 7) ? today : firstEventDay(next));
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("month", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Month nav */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => changeMonth(addMonths(month, -1))}
            className="rounded-pill p-2 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          >
            <Chevron dir="left" />
          </button>
          <h2 className={`${display.className} min-w-28 text-center text-base font-bold tabular-nums text-white sm:text-lg`}>
            {monthLabel(month)}
          </h2>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => changeMonth(addMonths(month, 1))}
            className="rounded-pill p-2 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          >
            <Chevron dir="right" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => changeMonth(today.slice(0, 7))}
          className={`${display.className} rounded-pill border border-white/15 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70`}
        >
          오늘
        </button>
      </div>

      {/* Calendar — lifted onto a surface card so it reads as a distinct panel
          against the page background, with stronger grid lines for legibility. */}
      <div className="flex flex-col overflow-hidden rounded-card border border-border bg-surface">
        {/* Weekday header (Korean, Pretendard — no Space Grotesk/uppercase) */}
        <div className="grid grid-cols-7 border-b border-white/[0.08] bg-white/[0.02]">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="border-r border-white/[0.08] py-2.5 text-center text-xs font-medium tracking-[0.08em] text-white/55 last:border-r-0"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="relative motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150" key={month}>
          <div role="grid" aria-label={monthLabel(month)} className="grid grid-cols-7">
          {weeks.map((week, wi) => (
            <div role="row" key={wi} className="contents">
              {week.map((cell) => (
                <DayCell
                  key={cell.date}
                  cell={cell}
                  events={cell.inMonth ? byDate.get(cell.date) ?? [] : []}
                  today={today}
                  selected={selected === cell.date}
                  onSelect={setSelected}
                  onNavigateMonth={changeMonth}
                />
              ))}
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Mobile selected-day list */}
      {selected && (
        <div className="flex flex-col gap-2 sm:hidden">
          <h3 className="text-sm font-semibold text-white">
            {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일{" "}
            <span className="text-white/45">({koWeekday(selected)})</span>
          </h3>
          {(byDate.get(selected)?.length ?? 0) > 0 ? (
            <ul className="flex flex-col">
              {byDate.get(selected)!.map((e) => (
                <DayEventRow key={e.id} event={e} />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-white/40">이 날에는 일정이 없어요.</p>
          )}
        </div>
      )}

      {/* Undated events */}
      {undated.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/[0.08] pt-5">
          <span className={`${display.className} text-2xs font-medium uppercase tracking-[0.16em] text-white/40`}>
            날짜 미정 · {undated.length}
          </span>
          <ul className="flex flex-col">
            {undated.map((e) => (
              <FixtureRow key={e.id} event={e} variant={isPast(e) ? "result" : "fixture"} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
