import { describe, it, expect } from "vitest";
import { validateHttpsUrlFormat, assertPublicHttpsUrl } from "@/lib/safe-url";

describe("validateHttpsUrlFormat", () => {
  it("accepts a public https URL", () => {
    expect(() => validateHttpsUrlFormat("https://api.example.com/leaderboard")).not.toThrow();
  });
  it("rejects non-https schemes", () => {
    expect(() => validateHttpsUrlFormat("http://example.com")).toThrow();
    expect(() => validateHttpsUrlFormat("file:///etc/passwd")).toThrow();
  });
  it("rejects malformed URLs", () => {
    expect(() => validateHttpsUrlFormat("not a url")).toThrow();
  });
  it("rejects localhost and internal hosts", () => {
    expect(() => validateHttpsUrlFormat("https://localhost/x")).toThrow();
    expect(() => validateHttpsUrlFormat("https://db.internal/x")).toThrow();
  });
  it("rejects private/loopback/link-local IP literals", () => {
    expect(() => validateHttpsUrlFormat("https://127.0.0.1/x")).toThrow();
    expect(() => validateHttpsUrlFormat("https://10.0.0.5/x")).toThrow();
    expect(() => validateHttpsUrlFormat("https://192.168.1.1/x")).toThrow();
    expect(() => validateHttpsUrlFormat("https://169.254.169.254/latest/meta-data")).toThrow();
    expect(() => validateHttpsUrlFormat("https://172.16.0.1/x")).toThrow();
  });
});

describe("assertPublicHttpsUrl (IP literals — no DNS)", () => {
  it("rejects a private IP literal without resolving DNS", async () => {
    await expect(assertPublicHttpsUrl("https://169.254.169.254/")).rejects.toThrow();
  });
  it("accepts a public IP literal without resolving DNS", async () => {
    await expect(assertPublicHttpsUrl("https://1.1.1.1/")).resolves.toBeInstanceOf(URL);
  });
});
