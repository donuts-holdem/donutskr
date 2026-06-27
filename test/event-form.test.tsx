import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EventForm } from "@/components/admin/EventForm";

describe("EventForm", () => {
  it("renders core fields", () => {
    render(<EventForm structures={[]} action={async () => {}} />);
    expect(screen.getByLabelText("이벤트명 *")).toBeInTheDocument();
    expect(screen.getByLabelText("상태")).toBeInTheDocument();
    expect(screen.getByLabelText("타이머 이벤트 ID")).toBeInTheDocument();
  });
});

describe("EventForm Phase 2 localization", () => {
  it("shows the status select in Korean and hides the category select", () => {
    render(<EventForm structures={[]} action={async () => {}} />);
    // Korean status label visible (default 예정 = scheduled)
    // Radix Select renders both a visible <span> and a hidden native <option>,
    // so use getAllByText to avoid "multiple elements" error.
    expect(screen.getAllByText("예정").length).toBeGreaterThanOrEqual(1);
    // category is hidden: no English category options, but value preserved in a hidden input
    expect(screen.queryByText("festival")).not.toBeInTheDocument();
    const hidden = document.querySelector('input[type="hidden"][name="category"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.value).toBe("upcoming"); // default for a new event
  });
});
