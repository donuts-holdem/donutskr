import { describe, it, expect } from "vitest";
import { EVENT_STATUS_LABELS, EVENT_STATUS_OPTIONS, eventStatusLabel } from "@/lib/site/labels";

describe("schedule labels", () => {
  it("covers all derived states and preserves unknown labels", () => {
    expect(Object.keys(EVENT_STATUS_LABELS).sort()).toEqual(
      ["canceled", "completed", "hidden", "reg_closed", "running", "scheduled"],
    );
    expect(eventStatusLabel("reg_closed")).toBe("레지마감");
    expect(eventStatusLabel("auto")).toBe("자동");
    expect(eventStatusLabel("unknown")).toBe("unknown");
  });
  it("offers the three stored intents", () => {
    expect(EVENT_STATUS_OPTIONS.map((option) => option.value)).toEqual(["auto", "canceled", "hidden"]);
  });
});
