import { describe, it, expect } from "vitest";
import {
  effectiveEventVisibility,
  effectiveSpecialPageVisibility,
  isEventPublic,
  isSpecialPagePublic,
} from "@/lib/visibility";

describe("effectiveEventVisibility", () => {
  it("is off when is_visible is false (status irrelevant)", () => {
    expect(effectiveEventVisibility({ is_visible: false, status: "confirmed" })).toBe("off");
    expect(effectiveEventVisibility({ is_visible: false, status: "hidden" })).toBe("off");
  });
  it("is hidden-flag when visible but status is hidden", () => {
    expect(effectiveEventVisibility({ is_visible: true, status: "hidden" })).toBe("hidden-flag");
  });
  it("is live when visible and status is not hidden", () => {
    expect(effectiveEventVisibility({ is_visible: true, status: "confirmed" })).toBe("live");
    expect(effectiveEventVisibility({ is_visible: true, status: "running" })).toBe("live");
  });
  it("isEventPublic is true only for live", () => {
    expect(isEventPublic({ is_visible: true, status: "confirmed" })).toBe(true);
    expect(isEventPublic({ is_visible: true, status: "hidden" })).toBe(false);
    expect(isEventPublic({ is_visible: false, status: "confirmed" })).toBe(false);
  });
});

describe("effectiveSpecialPageVisibility", () => {
  const today = "2026-06-27";
  it("is off when is_visible is false", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: false, start_show_date: null, end_show_date: null }, today)).toBe("off");
  });
  it("is window-before when today is before start_show_date", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: "2026-07-01", end_show_date: null }, today)).toBe("window-before");
  });
  it("is window-after when today is after end_show_date", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: null, end_show_date: "2026-06-01" }, today)).toBe("window-after");
  });
  it("is live when visible and inside the window (or no window)", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: null, end_show_date: null }, today)).toBe("live");
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: "2026-06-01", end_show_date: "2026-12-31" }, today)).toBe("live");
  });
  it("treats the boundary days as inside the window", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: "2026-06-27", end_show_date: "2026-06-27" }, today)).toBe("live");
  });
  it("isSpecialPagePublic is true only for live", () => {
    expect(isSpecialPagePublic({ is_visible: true, start_show_date: null, end_show_date: null }, today)).toBe(true);
    expect(isSpecialPagePublic({ is_visible: true, start_show_date: "2026-07-01", end_show_date: null }, today)).toBe(false);
  });
});
