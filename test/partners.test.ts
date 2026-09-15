import { describe, expect, it } from "vitest";
import { movePartnerOrder, orderedPartners, parsePartnerFields, parsePartnerOrder } from "@/lib/partners/validation";
import type { Partner } from "@/lib/partners/types";

const first = "10000000-0000-4000-8000-000000000001";
const second = "20000000-0000-4000-8000-000000000002";
const third = "30000000-0000-4000-8000-000000000003";
const partner = (id: string, sort_order: number, revision = 1): Partner => ({
  id, name: "테스트 파트너", description: "", logo_url: null,
  url: "https://partner.example/", sort_order, revision,
});

function form(url = "https://partner.example/members") {
  const value = new FormData();
  value.set("name", "  파트너  ");
  value.set("description", "  회원 안내  ");
  value.set("url", url);
  return value;
}

describe("partner input", () => {
  it.each([
    "javascript:alert(1)", "data:text/html,hello", "//partner.example",
    "https://admin:password@partner.example", "https://partner.example\\@evil.example",
    "https://partner.example/\npath", "https://", "https://partner.example:99999/",
    "https://partner.example/\u0001",
  ])("rejects unsafe or malformed external URLs: %s", value => {
    expect(() => parsePartnerFields(form(value))).toThrow();
  });
  it("normalizes the saved fields and permits HTTP(S) destinations", () => {
    expect(parsePartnerFields(form("HTTP://Partner.Example/members"))).toEqual({
      name: "파트너", description: "회원 안내", url: "http://partner.example/members", logo_url: null,
    });
  });
  it("accepts uploaded HTTPS logos and rejects mixed-content logos", () => {
    const value = form();
    value.set("logo_url", "https://storage.example/object/public/media/logo.png");
    expect(parsePartnerFields(value).logo_url).toBe("https://storage.example/object/public/media/logo.png");
    value.set("logo_url", "http://storage.example/logo.png");
    expect(() => parsePartnerFields(value)).toThrow();
  });
  it("rejects URLs whose encoded storage representation exceeds the limit", () => {
    expect(() => parsePartnerFields(form("https://partner.example/" + "가".repeat(230)))).toThrow();
  });
  it.each([["name", ""], ["name", "가".repeat(121)], ["description", "가".repeat(4001)]])("rejects invalid %s", (key, content) => {
    const value = form(); value.set(key, content);
    expect(() => parsePartnerFields(value)).toThrow();
  });
});

describe("partner ordering", () => {
  const records = [partner(third, 3, 6), partner(first, 1, 2), partner(second, 2, 4)];
  it("uses persisted order with an ID tie-breaker without mutating its input", () => {
    expect(orderedPartners([records[0], partner(second, 1), records[1]]).map(row => row.id)).toEqual([first, second, third]);
    expect(records.map(row => row.id)).toEqual([third, first, second]);
  });
  it("moves one card while retaining every record's concurrency revision", () => {
    expect(movePartnerOrder(records, third, "up")).toEqual([
      { id: first, revision: 2 }, { id: third, revision: 6 }, { id: second, revision: 4 },
    ]);
  });
  it("keeps the first and last card inside the list boundaries", () => {
    expect(movePartnerOrder(records, first, "up").map(row => row.id)).toEqual([first, second, third]);
    expect(movePartnerOrder(records, third, "down").map(row => row.id)).toEqual([first, second, third]);
  });
  it("rejects duplicate IDs, missing revisions and malformed reorder submissions", () => {
    for (const payload of [[{ id: first, revision: 2 }, { id: first, revision: 2 }], [{ id: first }], [{ id: first, revision: 0 }], { id: first }]) {
      const value = new FormData(); value.set("order", JSON.stringify(payload));
      expect(() => parsePartnerOrder(value)).toThrow();
    }
  });
});
