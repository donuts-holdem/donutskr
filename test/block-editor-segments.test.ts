import { describe, it, expect } from "vitest";
import { blocksToSegments, segmentsToBlocks, type Segment } from "@/lib/admin/block-editor-segments";
import type { Block } from "@/lib/program-blocks";

// Strip non-deterministic keys so segment shape can be asserted directly.
function shape(segments: Segment[]) {
  return segments.map((s) => {
    if (s.kind === "text") return { kind: s.kind, text: s.text };
    if (s.kind === "paragraph") return { kind: s.kind, runs: s.runs };
    return { kind: s.kind, block: s.block };
  });
}

describe("block-editor-segments", () => {
  describe("blocksToSegments", () => {
    it("merges consecutive plain paragraphs into one text segment (newline-joined)", () => {
      const blocks: Block[] = [
        { type: "paragraph", runs: [{ text: "a" }] },
        { type: "paragraph", runs: [{ text: "b" }] },
        { type: "paragraph", runs: [{ text: "c" }] },
      ];
      expect(shape(blocksToSegments(blocks))).toEqual([{ kind: "text", text: "a\nb\nc" }]);
    });

    it("keeps a formatted (bold/href) paragraph as its own paragraph segment", () => {
      const blocks: Block[] = [
        { type: "paragraph", runs: [{ text: "intro" }] },
        { type: "paragraph", runs: [{ text: "강조", bold: true }] },
        { type: "paragraph", runs: [{ text: "outro" }] },
      ];
      expect(shape(blocksToSegments(blocks))).toEqual([
        { kind: "text", text: "intro" },
        { kind: "paragraph", runs: [{ text: "강조", bold: true }] },
        { kind: "text", text: "outro" },
      ]);
    });

    it("splits a text run around non-text blocks (list / image)", () => {
      const list: Block = { type: "list", items: [[{ runs: [{ text: "item" }] }]] };
      const blocks: Block[] = [
        { type: "paragraph", runs: [{ text: "a" }] },
        list,
        { type: "paragraph", runs: [{ text: "b" }] },
      ];
      expect(shape(blocksToSegments(blocks))).toEqual([
        { kind: "text", text: "a" },
        { kind: "list", block: list },
        { kind: "text", text: "b" },
      ]);
    });

    it("returns a single empty text segment for empty input", () => {
      expect(shape(blocksToSegments([]))).toEqual([{ kind: "text", text: "" }]);
    });

    it("treats an href-only run as formatted", () => {
      const blocks: Block[] = [
        { type: "paragraph", runs: [{ text: "링크", href: "https://x.com" }] },
      ];
      expect(shape(blocksToSegments(blocks))).toEqual([
        { kind: "paragraph", runs: [{ text: "링크", href: "https://x.com" }] },
      ]);
    });
  });

  describe("segmentsToBlocks", () => {
    it("splits text segment by newline into paragraph blocks, preserving blank lines", () => {
      const segs: Segment[] = [{ kind: "text", key: "k1", text: "a\n\nb" }];
      expect(segmentsToBlocks(segs)).toEqual([
        { type: "paragraph", runs: [{ text: "a" }] },
        { type: "paragraph", runs: [] },
        { type: "paragraph", runs: [{ text: "b" }] },
      ]);
    });

    it("drops an entirely empty text segment (yields no blocks)", () => {
      const segs: Segment[] = [{ kind: "text", key: "k1", text: "" }];
      expect(segmentsToBlocks(segs)).toEqual([]);
    });
  });

  describe("round-trip (segmentsToBlocks ∘ blocksToSegments === identity)", () => {
    const cases: Record<string, Block[]> = {
      "plain only": [
        { type: "paragraph", runs: [{ text: "hello world" }] },
        { type: "paragraph", runs: [{ text: "second line" }] },
      ],
      "mixed types": [
        { type: "image", src: "https://example.com/i.jpg", alt: "i" },
        { type: "paragraph", runs: [{ text: "hello world" }] },
        { type: "list", items: [[{ runs: [{ text: "item 1" }] }], [{ runs: [{ text: "item 2" }] }]] },
        { type: "raw", html: "<strong>bold</strong>" },
      ],
      "formatted runs preserved exactly": [
        { type: "paragraph", runs: [{ text: "안녕" }, { text: "하세요", bold: true }] },
        { type: "paragraph", runs: [{ text: "클릭", href: "https://donuts.com" }] },
      ],
      "blank paragraph between plain": [
        { type: "paragraph", runs: [{ text: "a" }] },
        { type: "paragraph", runs: [] },
        { type: "paragraph", runs: [{ text: "b" }] },
      ],
    };

    for (const [name, blocks] of Object.entries(cases)) {
      it(name, () => {
        expect(segmentsToBlocks(blocksToSegments(blocks))).toEqual(blocks);
      });
    }
  });

  it("preserves image block order through round-trip", () => {
    const blocks: Block[] = [
      { type: "image", src: "a.jpg", alt: "a" },
      { type: "paragraph", runs: [{ text: "between" }] },
      { type: "image", src: "b.jpg", alt: "b" },
    ];
    const out = segmentsToBlocks(blocksToSegments(blocks));
    const images = out.filter((b) => b.type === "image");
    expect(images).toEqual([
      { type: "image", src: "a.jpg", alt: "a" },
      { type: "image", src: "b.jpg", alt: "b" },
    ]);
  });
});
