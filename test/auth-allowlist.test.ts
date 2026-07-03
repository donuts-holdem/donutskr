import { describe, it, expect } from "vitest";
import { parseAdminAllowlist, isAllowedAdminEmail } from "@/lib/admin-allowlist";

describe("parseAdminAllowlist", () => {
  it("returns [] for unset / empty env", () => {
    expect(parseAdminAllowlist(undefined)).toEqual([]);
    expect(parseAdminAllowlist(null)).toEqual([]);
    expect(parseAdminAllowlist("")).toEqual([]);
    expect(parseAdminAllowlist("   ")).toEqual([]);
    expect(parseAdminAllowlist(",, ,")).toEqual([]);
  });

  it("trims, lowercases, and drops empty entries", () => {
    expect(parseAdminAllowlist("  Admin@Example.com , B@x.io ")).toEqual([
      "admin@example.com",
      "b@x.io",
    ]);
    expect(parseAdminAllowlist("a@x.com,,b@x.com,")).toEqual(["a@x.com", "b@x.com"]);
  });
});

describe("isAllowedAdminEmail", () => {
  const env = "Admin@Example.com, second@x.io";

  it("matches case-insensitively and tolerates whitespace", () => {
    expect(isAllowedAdminEmail("admin@example.com", env)).toBe(true);
    expect(isAllowedAdminEmail("ADMIN@EXAMPLE.COM", env)).toBe(true);
    expect(isAllowedAdminEmail("  second@x.io  ", env)).toBe(true);
  });

  it("rejects emails not in the list", () => {
    expect(isAllowedAdminEmail("intruder@example.com", env)).toBe(false);
  });

  it("returns false for empty/unset env (no allowlist configured)", () => {
    expect(isAllowedAdminEmail("admin@example.com", "")).toBe(false);
    expect(isAllowedAdminEmail("admin@example.com", undefined)).toBe(false);
  });

  it("returns false for missing email", () => {
    expect(isAllowedAdminEmail(undefined, env)).toBe(false);
    expect(isAllowedAdminEmail(null, env)).toBe(false);
    expect(isAllowedAdminEmail("", env)).toBe(false);
  });
});
