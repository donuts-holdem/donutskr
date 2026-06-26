import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Event } from "@/lib/types";
import { CalendarView } from "@/components/schedule/CalendarView";

function ev(over: Partial<Event>): Event {
  return {
    id: "e1",
    title: "도너츠 토너먼트",
    date: "2026-07-04",
    buy_in: "50,000 Pt",
    status: "confirmed",
    location: "챔스홀덤",
    weekday: "토",
    start_time: "14:00",
    ...over,
  } as unknown as Event;
}

describe("CalendarView", () => {
  const today = "2026-07-04";

  it("shows the month label and a clickable stakes chip linking to detail", () => {
    render(<CalendarView events={[ev({})]} today={today} initialMonth="2026-07" />);
    expect(screen.getByText("2026년 7월")).toBeInTheDocument();
    // Scope to the grid: Task 5 adds a mobile selected-day list (outside role="grid")
    // that renders the same event as another link, so a bare getByRole would collide.
    const link = within(screen.getByRole("grid")).getByRole("link", { name: /도너츠 토너먼트/ });
    expect(link).toHaveAttribute("href", "/schedule/e1");
    expect(within(link).getByText("50K")).toBeInTheDocument();
  });

  it("renders an undated strip for events without a date", () => {
    render(
      <CalendarView
        events={[{ ...ev({}), id: "u1", date: null } as unknown as Event]}
        today={today}
        initialMonth="2026-07"
      />
    );
    expect(screen.getByText(/날짜 미정/)).toBeInTheDocument();
  });

  it("collapses overflow into a +N trigger button", () => {
    const many: Event[] = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`,
      title: `이벤트 ${i}`,
      date: "2026-07-04",
      buy_in: "10,000 Pt",
      status: "confirmed",
    } as unknown as Event));
    render(<CalendarView events={many} today={"2026-07-04"} initialMonth="2026-07" />);
    // 3 chips shown + a "+2" overflow trigger (5 total, MAX_CHIPS=3)
    expect(screen.getByRole("button", { name: "2개 더 보기" })).toBeInTheDocument();
  });

  it("renders a selected-day list region for the mobile view", () => {
    render(
      <CalendarView
        events={[ev({})]}
        today={"2026-07-04"}
        initialMonth="2026-07"
      />
    );
    // default selected day = today (in month) → its heading appears (sm:hidden, still in DOM)
    expect(screen.getByRole("heading", { name: /7월 4일/ })).toBeInTheDocument();
  });
});
