import { describe, it, expect } from "vitest";
import { blocksText, hasVisibleContent, type Block } from "@/lib/program-blocks";
import { coerceDescriptionBlocks } from "@/lib/admin/structured-fields";

const para = (t: string): Block => ({ type: "paragraph", runs: [{ text: t }] });

describe("blocksText", () => {
  it("concatenates run text across paragraphs, lists, and raw", () => {
    const blocks: Block[] = [
      { type: "image", src: "x", alt: "" },
      para("A"),
      { type: "list", items: [[{ runs: [{ text: "B" }, { text: "C" }] }], [{ runs: [{ text: "D" }] }]] },
    ];
    expect(blocksText(blocks)).toBe("ABCD");
  });
});

describe("hasVisibleContent", () => {
  it("true when any image or non-empty run exists", () => {
    expect(hasVisibleContent([{ type: "image", src: "x", alt: "" }])).toBe(true);
    expect(hasVisibleContent([para("hi")])).toBe(true);
  });
  it("false for empty or spacer-only blocks", () => {
    expect(hasVisibleContent([])).toBe(false);
    expect(hasVisibleContent([{ type: "paragraph", runs: [] }])).toBe(false);
    expect(hasVisibleContent([{ type: "paragraph", runs: [{ text: "  " }] }])).toBe(false);
  });
});

describe("coerceDescriptionBlocks", () => {
  it("returns [] for non-arrays", () => {
    expect(coerceDescriptionBlocks(null)).toEqual([]);
    expect(coerceDescriptionBlocks("x")).toEqual([]);
  });
  it("normalizes partial run shapes (missing flags, string bold)", () => {
    const out = coerceDescriptionBlocks([{ type: "paragraph", runs: [{ text: "a", bold: "true", href: "" }, { foo: 1 }] }]);
    expect(out).toEqual([{ type: "paragraph", runs: [{ text: "a", bold: true }, { text: "" }] }]);
  });
  it("keeps image src/alt/decorative and list paragraph nesting", () => {
    expect(coerceDescriptionBlocks([{ type: "image", src: "s", alt: "", decorative: true }]))
      .toEqual([{ type: "image", src: "s", alt: "", decorative: true }]);
    expect(coerceDescriptionBlocks([{ type: "list", items: [[{ runs: [{ text: "x" }] }]] }]))
      .toEqual([{ type: "list", items: [[{ runs: [{ text: "x" }] }]] }]);
  });
  it("preserves an unknown block type as raw rather than dropping it", () => {
    const out = coerceDescriptionBlocks([{ type: "whoops", html: "<table></table>" }]);
    expect(out[0].type).toBe("raw");
  });
  it("keeps raw html verbatim", () => {
    expect(coerceDescriptionBlocks([{ type: "raw", html: "<x>" }])).toEqual([{ type: "raw", html: "<x>" }]);
  });
});
