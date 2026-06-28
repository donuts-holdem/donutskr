import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EventForm } from "@/components/admin/EventForm";
import type { Event, Season, BlindStructure } from "@/lib/types";

const minimalEvent: Event = {
  id: "ev1",
  season_id: null,
  title: "Test Event",
  event_type: null,
  date: null,
  weekday: null,
  location: null,
  address: null,
  start_time: null,
  reg_close_time: null,
  buy_in: null,
  entry_link: null,
  button_label: null,
  description: null,
  poster_image: null,
  category: "upcoming",
  status: "scheduled",
  is_visible: true,
  blind_structure_id: null,
  timer_event_id: null,
  timer_event_url: null,
};

const seasons: Season[] = [
  { id: "S1", name: "2024 봄", year: 2024, start_date: null, end_date: null, is_active: true, hero_text: null, sub_text: null, badge_text: null, hero_image: null, bg_image: null },
];

const structures: BlindStructure[] = [
  { id: "BS1", name: "스탠다드", is_template: true, event_type: null },
];

describe("FK unset — season_id (EventForm)", () => {
  it("includes a 없음 option in the season select", () => {
    render(
      <EventForm
        event={{ ...minimalEvent, season_id: "S1" }}
        seasons={seasons}
        structures={structures}
        action={async () => {}}
      />
    );
    // Radix renders label in both the trigger and hidden option list
    expect(screen.getAllByText("없음").length).toBeGreaterThan(0);
  });

  it("shows 없음 as the selected trigger value when season_id is null", () => {
    render(
      <EventForm
        event={{ ...minimalEvent, season_id: null }}
        seasons={seasons}
        structures={structures}
        action={async () => {}}
      />
    );
    // defaultValue="none" selects the 없음 item → trigger renders 없음
    expect(screen.getAllByText("없음")[0]).toBeInTheDocument();
  });
});

describe("FK unset — blind_structure_id (EventForm)", () => {
  it("includes a 없음 option in the blind structure select", () => {
    render(
      <EventForm
        event={{ ...minimalEvent, blind_structure_id: "BS1" }}
        seasons={seasons}
        structures={structures}
        action={async () => {}}
      />
    );
    expect(screen.getAllByText("없음").length).toBeGreaterThan(0);
  });

  it("shows 없음 as selected trigger value when blind_structure_id is null", () => {
    render(
      <EventForm
        event={{ ...minimalEvent, blind_structure_id: null }}
        seasons={seasons}
        structures={structures}
        action={async () => {}}
      />
    );
    expect(screen.getAllByText("없음")[0]).toBeInTheDocument();
  });
});
