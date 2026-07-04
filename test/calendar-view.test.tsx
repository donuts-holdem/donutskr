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
    organizer: "도너츠",
    status: "confirmed",
    location: "챔스홀덤",
    weekday: "토",
    start_time: "14:00",
    ...over,
  } as unknown as Event;
}

describe("CalendarView", () => {
  const today = "2026-07-04";

  it("shows the month label and a title chip linking to detail without a buy-in prefix", () => {
    render(<CalendarView events={[ev({})]} today={today} initialMonth="2026-07" />);
    expect(screen.getByText("2026년 7월")).toBeInTheDocument();
    // Scope to the grid: Task 5 adds a mobile selected-day list (outside role="grid")
    // that renders the same event as another link, so a bare getByRole would collide.
    const link = within(screen.getByRole("grid")).getByRole("link", { name: /도너츠 토너먼트/ });
    expect(link).toHaveAttribute("href", "/schedule/e1");
    // buy-in no longer prefixes the calendar chip
    expect(within(link).queryByText("50K")).not.toBeInTheDocument();
  });

  it("prefixes the chip with the gold start time when one is set", () => {
    render(<CalendarView events={[ev({})]} today={today} initialMonth="2026-07" />);
    const link = within(screen.getByRole("grid")).getByRole("link", { name: /14:00.*도너츠 토너먼트/ });
    expect(within(link).getByText("14:00", { exact: false })).toBeInTheDocument();
  });

  it("omits the time prefix when start_time is undecided", () => {
    render(
      <CalendarView
        events={[ev({ id: "e5", start_time: "미정" })]}
        today={today}
        initialMonth="2026-07"
      />
    );
    const link = within(screen.getByRole("grid")).getByRole("link", { name: /도너츠 토너먼트/ });
    expect(within(link).queryByText(/미정/)).not.toBeInTheDocument();
  });

  it("highlights the organizer token inside the title in the grid", () => {
    render(<CalendarView events={[ev({})]} today={today} initialMonth="2026-07" />);
    const link = within(screen.getByRole("grid")).getByRole("link", { name: /도너츠 토너먼트/ });
    // organizer portion is its own highlighted span; the rest flows around it
    const token = within(link).getByText("도너츠", { selector: "span.font-semibold" });
    expect(token).toBeInTheDocument();
  });

  it("prefixes the organizer token when the title does not contain it", () => {
    render(
      <CalendarView
        events={[ev({ id: "e2", title: "여름 특별전", organizer: "포커루루" })]}
        today={today}
        initialMonth="2026-07"
      />
    );
    const link = within(screen.getByRole("grid")).getByRole("link", { name: /포커루루 여름 특별전/ });
    expect(within(link).getByText("포커루루", { selector: "span.font-semibold" })).toBeInTheDocument();
  });

  it("highlights a mid-title organizer without duplicating it", () => {
    render(
      <CalendarView
        events={[ev({ id: "e4", title: "챔피언십 토너먼트 with ONEPAIR", organizer: "ONEPAIR" })]}
        today={today}
        initialMonth="2026-07"
      />
    );
    const link = within(screen.getByRole("grid")).getByRole("link", {
      name: /챔피언십 토너먼트 with ONEPAIR$/,
    });
    expect(within(link).getByText("ONEPAIR", { selector: "span.font-semibold" })).toBeInTheDocument();
  });

  it("renders the plain title when no organizer is set", () => {
    render(
      <CalendarView
        events={[ev({ id: "e3", organizer: null })]}
        today={today}
        initialMonth="2026-07"
      />
    );
    const link = within(screen.getByRole("grid")).getByRole("link", { name: /도너츠 토너먼트/ });
    expect(within(link).queryByText("도너츠", { selector: "span.font-semibold" })).not.toBeInTheDocument();
  });

  it("shows the venue on its own line in the selected-day list", () => {
    render(<CalendarView events={[ev({})]} today={today} initialMonth="2026-07" />);
    // selected-day list renders the event's location beneath its title
    expect(screen.getAllByText("챔스홀덤").length).toBeGreaterThan(0);
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
