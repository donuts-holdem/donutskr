import type { Event } from "@/lib/types";

export type DayCell = { date: string; day: number; inMonth: boolean };
export type Week = DayCell[]; // length 7

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

// 6-week (42-cell) grid for year/month (month 1-12), week starting Sunday.
// Computed in UTC so the cell dates never drift with the host timezone.
export function buildMonthGrid(year: number, month: number): Week[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay()); // back up to Sunday on/before the 1st
  const weeks: Week[] = [];
  for (let w = 0; w < 6; w++) {
    const week: Week = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setUTCDate(start.getUTCDate() + w * 7 + d);
      const y = cur.getUTCFullYear();
      const m = cur.getUTCMonth() + 1;
      week.push({
        date: `${y}-${pad(m)}-${pad(cur.getUTCDate())}`,
        day: cur.getUTCDate(),
        inMonth: y === year && m === month,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

// Group events by "YYYY-MM-DD". Undated ("미정"/null) events are skipped.
export function groupEventsByDate(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();
  for (const e of events) {
    const m = DATE_PREFIX.exec(e.date ?? "");
    if (!m) continue;
    const arr = map.get(m[1]);
    if (arr) arr.push(e);
    else map.set(m[1], [e]);
  }
  return map;
}

// "2026-07" + delta -> "YYYY-MM", crossing year boundaries.
export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

// "2026-07" -> "2026년 7월"
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${y}년 ${m}월`;
}

// Compact buy-in for an in-cell chip: "50,000 Pt" -> "50K"; "프리롤" -> "프리롤".
export function formatBuyInShort(buyIn: string | null): string | null {
  if (!buyIn) return null;
  const trimmed = buyIn.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/[\d,]+/); // first amount only ("30,000 + 3,000" → "30,000")
  if (!match) return trimmed; // no number → show as-is (e.g. "프리롤")
  const n = Number(match[0].replace(/,/g, ""));
  if (!n) return trimmed;
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return String(n);
}
