import { describe, it, expect } from "vitest";
import { serializeBlocks } from "@/components/admin/rich-editor-serialize";

describe("serializeBlocks", () => {
  it("empty editor → []", () => {
    expect(serializeBlocks("<p></p>", true)).toBe("[]");
  });

  it("non-empty → single raw block", () => {
    expect(serializeBlocks("<p>hi</p>", false)).toBe(JSON.stringify([{ type: "raw", html: "<p>hi</p>" }]));
  });
});
