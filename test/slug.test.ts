import { describe, it, expect } from "vitest";
import { normalizeSlug } from "@/lib/slug";

describe("normalizeSlug", () => {
  it("decodes percent-encoded Korean slugs to their NFC form", () => {
    const encoded = encodeURIComponent("wpl-홀덤-마스터스");
    expect(normalizeSlug(encoded)).toBe("wpl-홀덤-마스터스".normalize("NFC"));
  });

  it("leaves an already-decoded ASCII slug unchanged", () => {
    expect(normalizeSlug("donutslab")).toBe("donutslab");
  });

  it("normalizes NFD-composed input to NFC", () => {
    const nfd = "홀덤".normalize("NFD");
    expect(normalizeSlug(nfd)).toBe("홀덤".normalize("NFC"));
  });

  it("returns the raw value when percent-encoding is malformed", () => {
    expect(normalizeSlug("abc%")).toBe("abc%");
  });
});
