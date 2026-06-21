import { describe, it, expect } from "vitest";
import {
  programStatusLabel,
  isExternalUrl,
  resolveHref,
  formatDotDate,
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

describe("formatDotDate", () => {
  it("formats ISO timestamps and dates as YYYY.MM.DD", () => {
    expect(formatDotDate("2026-06-20T12:00:00.000Z")).toBe("2026.06.20");
    expect(formatDotDate("2026-06-20")).toBe("2026.06.20");
  });
});
