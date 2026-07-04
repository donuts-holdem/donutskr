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

// 기획단체(organizer) 표기 분리. 캘린더는 참가비 대신 기획단체명을 하이라이트해
// 표기한다 (클라이언트 예시: "도너츠 P.K.O 이벤트"에서 '도너츠'만 강조).
// 제목이 기획단체명으로 시작하면 그 부분을 잘라 하이라이트 토큰으로 쓰고(중복
// 표기 방지), 아니면 단체명을 접두 토큰으로 붙인다.
export function splitOrganizerLabel(
  title: string,
  organizer: string | null | undefined,
): { organizer: string | null; title: string } {
  const org = organizer?.trim();
  const t = title.trim();
  if (!org) return { organizer: null, title: t };
  if (t.toLowerCase().startsWith(org.toLowerCase())) {
    return { organizer: t.slice(0, org.length), title: t.slice(org.length).trim() };
  }
  return { organizer: org, title: t };
}
