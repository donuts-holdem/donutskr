import { describe, it, expect } from "vitest";
import {
  EVENT_STATUS_LABELS, EVENT_STATUS_OPTIONS, eventStatusLabel,
  PROGRAM_GROUP_OPTIONS, programGroupLabel,
  TAB_TYPE_OPTIONS, LEAGUE_STATUS_OPTIONS, PROGRAM_STATUS_OPTIONS, normalizeProgramStatus,
} from "@/lib/labels";

describe("labels", () => {
  it("covers every EventStatus key with a Korean label", () => {
    expect(Object.keys(EVENT_STATUS_LABELS).sort()).toEqual(
      ["canceled","completed","confirmed","hidden","reg_closed","running","scheduled"]
    );
    expect(eventStatusLabel("reg_closed")).toBe("레지마감");
    expect(eventStatusLabel("unknown")).toBe("unknown"); // passthrough
    expect(EVENT_STATUS_OPTIONS.find((o) => o.value === "scheduled")?.label).toBe("예정");
  });
  it("localizes program group", () => {
    expect(programGroupLabel("poker")).toBe("포커");
    expect(PROGRAM_GROUP_OPTIONS).toHaveLength(3);
  });
  it("provides tab type and league status options in Korean", () => {
    expect(TAB_TYPE_OPTIONS.find((o) => o.value === "external")?.label).toBe("외부 링크");
    expect(LEAGUE_STATUS_OPTIONS.find((o) => o.value === "preparing")?.label).toBe("준비 중");
  });
  it("normalizes legacy program status free-text to standard keys (§2.2)", () => {
    expect(normalizeProgramStatus("모집 중")).toBe("recruiting"); // space variant in real data
    expect(normalizeProgramStatus("모집중")).toBe("recruiting");
    expect(normalizeProgramStatus("모집 완료")).toBe("closed");
    expect(normalizeProgramStatus("")).toBe("");
    expect(normalizeProgramStatus(null)).toBe("");
    expect(normalizeProgramStatus("recruiting")).toBe("recruiting"); // already standard
    expect(normalizeProgramStatus("기괴한값")).toBe(""); // unknown → empty
    expect(PROGRAM_STATUS_OPTIONS.map((o) => o.value)).toEqual(["recruiting","ongoing","closed","completed"]);
  });
});
