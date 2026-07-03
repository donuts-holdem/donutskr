import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { Program } from "@/lib/types";
import { ProgramCard } from "@/components/program/ProgramCard";

// A program whose status is a custom, DB-managed value the static map (lib/
// program-display.ts) has never heard of. Without a status→label map the public
// card would show the raw slug "waitlist"; with it, the operator's label wins.
function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    slug: "welcome",
    title: "웰컴 프로그램",
    category: null,
    program_group: "poker",
    status: "waitlist",
    member_count: 0,
    location: null,
    start_date: null,
    end_date: null,
    description: null,
    cover_image: null,
    manager_name: null,
    manager_role: null,
    manager_avatar: null,
    cta_label: null,
    entry_link: null,
    is_hot: false,
    is_affiliate: false,
    is_visible: true,
    sort_order: 0,
    description_blocks: null,
    description_verified: false,
    ...overrides,
  };
}

describe("ProgramCard status label", () => {
  it("renders the DB-managed status label for a custom status", () => {
    render(<ProgramCard program={makeProgram()} statusLabels={{ waitlist: "대기중" }} />);
    expect(screen.getByText("대기중")).toBeTruthy();
    expect(screen.queryByText("waitlist")).toBeNull();
  });

  it("lets the DB label override the static built-in label", () => {
    render(
      <ProgramCard
        program={makeProgram({ status: "recruiting" })}
        statusLabels={{ recruiting: "참가 접수중" }}
      />,
    );
    expect(screen.getByText("참가 접수중")).toBeTruthy();
    expect(screen.queryByText("모집중")).toBeNull();
  });

  it("falls back to the static label when no map is provided", () => {
    render(<ProgramCard program={makeProgram({ status: "closed" })} />);
    expect(screen.getByText("마감")).toBeTruthy();
  });
});
