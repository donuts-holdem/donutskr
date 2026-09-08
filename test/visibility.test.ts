import { describe, it, expect } from "vitest";
import {
  effectiveEventVisibility,
  isEventPublic,
} from "@/lib/site/visibility";

describe("effectiveEventVisibility", () => {
  it("is off when is_visible is false (status irrelevant)", () => {
    expect(effectiveEventVisibility({ is_visible: false, status: "auto" })).toBe("off");
    expect(effectiveEventVisibility({ is_visible: false, status: "hidden" })).toBe("off");
  });
  it("is hidden-flag when visible but stored status is hidden", () => {
    expect(effectiveEventVisibility({ is_visible: true, status: "hidden" })).toBe("hidden-flag");
  });
  it("is live when visible and status is the auto intent", () => {
    expect(effectiveEventVisibility({ is_visible: true, status: "auto" })).toBe("live");
    expect(effectiveEventVisibility({ is_visible: true, status: "canceled" })).toBe("live");
  });
  it("isEventPublic is true only for live", () => {
    expect(isEventPublic({ is_visible: true, status: "auto" })).toBe(true);
    expect(isEventPublic({ is_visible: true, status: "hidden" })).toBe(false);
    expect(isEventPublic({ is_visible: false, status: "auto" })).toBe(false);
  });
});
