import { describe, it, expect } from "vitest";
import {
  programStatusLabel,
  resolveProgramStatusLabel,
  isExternalUrl,
  resolveHref,
  formatDotDate,
  formatDateRange,
  programHref,
} from "@/lib/program-display";

describe("programStatusLabel", () => {
  it("maps known statuses to Korean labels", () => {
    expect(programStatusLabel("recruiting")).toBe("모집중");
    expect(programStatusLabel("ongoing")).toBe("진행중");
    expect(programStatusLabel("closed")).toBe("마감");
    expect(programStatusLabel("completed")).toBe("종료");
  });
  it("returns empty string for null and passes through unknown values", () => {
    expect(programStatusLabel(null)).toBe("");
    expect(programStatusLabel("custom")).toBe("custom");
  });
});

describe("resolveProgramStatusLabel", () => {
  it("prefers the DB-managed status label over the static map", () => {
    // An admin renamed the built-in status; the DB label must win.
    expect(resolveProgramStatusLabel("recruiting", { recruiting: "참가 접수중" })).toBe("참가 접수중");
  });
  it("uses the DB label for a custom status the static map has never heard of", () => {
    expect(resolveProgramStatusLabel("waitlist", { waitlist: "대기중" })).toBe("대기중");
  });
  it("falls back to the static label when the value is absent from the map", () => {
    expect(resolveProgramStatusLabel("closed", {})).toBe("마감");
    expect(resolveProgramStatusLabel("closed")).toBe("마감");
  });
  it("passes an unknown value straight through when no label exists anywhere", () => {
    expect(resolveProgramStatusLabel("waitlist", {})).toBe("waitlist");
  });
  it("returns empty string for null regardless of the map", () => {
    expect(resolveProgramStatusLabel(null, { recruiting: "x" })).toBe("");
  });
});

describe("isExternalUrl", () => {
  it("treats http(s)/protocol-relative/mailto/tel as external", () => {
    expect(isExternalUrl("https://example.com")).toBe(true);
    expect(isExternalUrl("http://example.com")).toBe(true);
    expect(isExternalUrl("//cdn.example.com")).toBe(true);
    expect(isExternalUrl("mailto:a@b.com")).toBe(true);
    expect(isExternalUrl("tel:+8210")).toBe(true);
  });
  it("treats app paths as internal", () => {
    expect(isExternalUrl("/programs/poker")).toBe(false);
    expect(isExternalUrl("/")).toBe(false);
  });
});

describe("resolveHref", () => {
  it("returns href with external flag", () => {
    expect(resolveHref("https://x.com")).toEqual({ href: "https://x.com", isExternal: true });
    expect(resolveHref("/series")).toEqual({ href: "/series", isExternal: false });
  });
});

describe("programHref", () => {
  it("always returns the internal detail route", () => {
    expect(programHref({ slug: "series" })).toBe("/programs/series");
    expect(programHref({ slug: "holdem-lab" })).toBe("/programs/holdem-lab");
  });
});

describe("formatDotDate", () => {
  it("formats ISO timestamps and dates as YYYY.MM.DD", () => {
    expect(formatDotDate("2026-06-20T12:00:00.000Z")).toBe("2026.06.20");
    expect(formatDotDate("2026-06-20")).toBe("2026.06.20");
  });
});

describe("formatDateRange", () => {
  it("shows the start alone when there is no end date", () => {
    expect(formatDateRange("2026-06-20", null)).toBe("2026.06.20");
  });
  it("joins start and end with an en dash when an end date exists", () => {
    expect(formatDateRange("2026-06-20", "2026-07-04")).toBe("2026.06.20 – 2026.07.04");
  });
});
