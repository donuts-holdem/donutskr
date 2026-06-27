import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StateBadge } from "@/components/admin/StateBadge";

describe("StateBadge", () => {
  it("renders an accessible label for visible on/off", () => {
    const { rerender } = render(<StateBadge on kind="visible" />);
    expect(screen.getByLabelText("노출 중")).toBeInTheDocument();
    rerender(<StateBadge on={false} kind="visible" />);
    expect(screen.getByLabelText("노출 안 함")).toBeInTheDocument();
  });
  it("conveys state with text, not color alone (visible text differs)", () => {
    const { rerender } = render(<StateBadge on kind="visible" />);
    expect(screen.getByText("노출")).toBeInTheDocument();
    rerender(<StateBadge on={false} kind="visible" />);
    expect(screen.getByText("비노출")).toBeInTheDocument();
  });
  it("labels HOT and 제휴 with on/off accessible names", () => {
    const { rerender } = render(<StateBadge on kind="hot" />);
    expect(screen.getByLabelText("HOT 표시 켜짐")).toBeInTheDocument();
    rerender(<StateBadge on={false} kind="affiliate" />);
    expect(screen.getByLabelText("제휴 표시 꺼짐")).toBeInTheDocument();
  });
});
