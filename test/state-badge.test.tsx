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
  it("flags an expired program with text and an accessible label", () => {
    render(<StateBadge on kind="expired" />);
    expect(screen.getByText("종료됨")).toBeInTheDocument();
    expect(screen.getByLabelText("종료일 지남 (공개 사이트 미노출)")).toBeInTheDocument();
  });
});
