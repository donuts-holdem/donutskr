import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EffectiveVisibilityBadge } from "@/components/admin/EffectiveVisibilityBadge";

describe("EffectiveVisibilityBadge", () => {
  it("shows live", () => {
    render(<EffectiveVisibilityBadge state="live" />);
    expect(screen.getByText("노출 중")).toBeInTheDocument();
  });
  it("explains why a turned-on entity is not public (hidden status)", () => {
    render(<EffectiveVisibilityBadge state="hidden-flag" />);
    expect(screen.getByText("노출 안 됨 · 숨김 상태")).toBeInTheDocument();
    expect(screen.getByLabelText(/숨김/)).toBeInTheDocument();
  });
  it("shows a disabled event", () => {
    render(<EffectiveVisibilityBadge state="off" />);
    expect(screen.getByText("비노출")).toBeInTheDocument();
  });
});
