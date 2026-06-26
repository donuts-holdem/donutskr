import { describe, it, expect } from "vitest";
import type { Event } from "@/lib/types";
import {
  buildMonthGrid,
  groupEventsByDate,
  addMonths,
  monthLabel,
  formatBuyInShort,
  WEEKDAYS,
} from "@/lib/calendar";

function ev(date: string | null, over: Partial<Event> = {}): Event {
  return { id: date ?? "x", date, buy_in: null, status: "scheduled", ...over } as unknown as Event;
}

describe("WEEKDAYS", () => {
  it("is Sunday-first Korean labels", () => {
    expect(WEEKDAYS).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });
});

describe("buildMonthGrid", () => {
  it("always returns 6 weeks of 7 days starting Sunday", () => {
    const weeks = buildMonthGrid(2026, 7);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date.length).toBe(10); // YYYY-MM-DD
  });

  it("July 2026 (1st is Wed) leads with the prior Sunday and flags inMonth", () => {
    const weeks = buildMonthGrid(2026, 7);
    // 2026-07-01 is a Wednesday → first cell is Sunday 2026-06-28
    expect(weeks[0][0].date).toBe("2026-06-28");
    expect(weeks[0][0].inMonth).toBe(false);
    const first = weeks[0][3];
    expect(first.date).toBe("2026-07-01");
    expect(first.inMonth).toBe(true);
    expect(first.day).toBe(1);
  });

  it("handles leap-year February", () => {
    const days = buildMonthGrid(2024, 2).flat().filter((c) => c.inMonth);
    expect(days[days.length - 1].day).toBe(29);
  });

  it("handles non-leap February", () => {
    const days = buildMonthGrid(2025, 2).flat().filter((c) => c.inMonth);
    expect(days[days.length - 1].day).toBe(28);
  });
});

describe("groupEventsByDate", () => {
  it("groups by date prefix and skips undated", () => {
    const m = groupEventsByDate([
      ev("2026-07-04T14:00:00"),
      ev("2026-07-04"),
      ev(null),
      ev("미정"),
    ]);
    expect(m.get("2026-07-04")).toHaveLength(2);
    expect([...m.keys()]).toEqual(["2026-07-04"]);
  });
});

describe("addMonths", () => {
  it("crosses year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-07", 0)).toBe("2026-07");
  });
});

describe("monthLabel", () => {
  it("formats Korean", () => {
    expect(monthLabel("2026-07")).toBe("2026년 7월");
  });
});

describe("formatBuyInShort", () => {
  it("abbreviates thousands and falls back gracefully", () => {
    expect(formatBuyInShort("50,000 Pt")).toBe("50K");
    expect(formatBuyInShort("5,000P")).toBe("5K");
    expect(formatBuyInShort("30,000 + 3,000")).toBe("30K"); // first amount only
    expect(formatBuyInShort("500")).toBe("500");
    expect(formatBuyInShort("프리롤")).toBe("프리롤");
    expect(formatBuyInShort(null)).toBeNull();
    expect(formatBuyInShort("  ")).toBeNull();
  });
});
