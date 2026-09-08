import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EventForm } from "@/components/admin/EventForm";

describe("EventForm", () => {
  it("renders core fields", () => {
    render(<EventForm structures={[]} action={async () => {}} />);
    expect(screen.getByLabelText("이벤트명 *")).toBeInTheDocument();
    expect(screen.getByLabelText("상태")).toBeInTheDocument();
    expect(screen.getByLabelText("블라인드 스트럭처")).toBeInTheDocument();
  });
});

describe("EventForm Phase 2 localization", () => {
  it("shows the status select in Korean", () => {
    render(<EventForm structures={[]} action={async () => {}} />);
    // Korean stored-intent label visible (default 자동 = auto).
    // Radix Select renders both a visible <span> and a hidden native <option>,
    // so use getAllByText to avoid "multiple elements" error.
    expect(screen.getAllByText("자동")[0]).toBeInTheDocument();
  });
});
