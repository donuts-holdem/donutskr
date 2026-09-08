import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Event, Season } from "@/lib/site/types";
import { SeriesBoard } from "@/components/series/SeriesBoard";

function ev(over: Partial<Event>): Event {
  return {
    id: "e1",
    title: "도너츠 오프닝 토너먼트",
    date: "2999-07-04",
    buy_in: "50,000 Pt",
    organizer: "도너츠",
    status: "auto",
    location: "챔스홀덤",
    start_time: "14:00",
    ...over,
  } as unknown as Event;
}

const season: Season = {
  name: "2026 시즌",
  year: 2026,
  hero_text: "2026 도너츠 시리즈",
} as unknown as Season;

describe("SeriesBoard", () => {
  it("does not link to retired features", () => {
    render(<SeriesBoard season={season} events={[]} />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/^\/(programs|leaderboard|online-league|lab|timer)(?:\/|$)/);
    }
  });
  it("renders the season fixtures with a link to the full schedule", () => {
    render(<SeriesBoard season={season} events={[ev({})]} />);
    const fixtures = screen.getByRole("region", { name: "이번 시즌 이벤트" });
    expect(
      within(fixtures).getByRole("link", { name: /도너츠 오프닝 토너먼트/ })
    ).toHaveAttribute("href", "/schedule/e1");
    expect(
      within(fixtures).getByRole("link", { name: /전체 일정/ })
    ).toHaveAttribute("href", "/schedule");
  });

  it("shows an empty state when there are no upcoming events", () => {
    render(<SeriesBoard season={season} events={[]} />);
    expect(screen.getByText("예정된 이벤트가 준비 중입니다.")).toBeInTheDocument();
  });

  it("renders the participation guide as an ordered 4-step list", () => {
    render(<SeriesBoard season={season} events={[]} />);
    const join = screen.getByRole("region", { name: "참여 안내" });
    const list = within(join).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });

  it("links the final CTA to the signup link when provided", () => {
    render(
      <SeriesBoard
        season={season}
        events={[]}
        signupLink="https://join.example.com"
        signupLabel="시즌 멤버십 신청"
        signupNewTab
      />
    );
    const join = screen.getByRole("region", { name: "참여 안내" });
    const cta = within(join).getByRole("link", { name: /시즌 멤버십 신청/ });
    expect(cta).toHaveAttribute("href", "https://join.example.com");
    expect(cta).toHaveAttribute("target", "_blank");
  });
});
