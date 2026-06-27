import { describe, it, expect } from "vitest";
import { htmlToBlocks } from "@/lib/program-blocks-convert";
import { blocksText } from "@/lib/program-blocks";

// text nodes of an HTML string, entity-decoded, in order — the invariant's right side.
import { parseFragment } from "parse5";
type ParseNode = { nodeName: string; value?: string; childNodes?: ParseNode[] };
function sourceText(html: string): string {
  let out = "";
  const walk = (node: ParseNode) => {
    if (node.nodeName === "#text") out += node.value ?? "";
    for (const c of node.childNodes ?? []) walk(c);
  };
  const root = parseFragment(html) as unknown as { childNodes: ParseNode[] };
  for (const c of root.childNodes) walk(c);
  return out;
}

describe("htmlToBlocks — real fixtures", () => {
  it("bold+link composes into one run with both marks (3 runs total)", () => {
    const html = `<p dir="auto"><strong>📍포커루루 이벤트 페이지(</strong><a href="https://event.pokerlulu.com/" target="_blank"><strong>https://event.pokerlulu.com/</strong></a><strong>)</strong></p>`;
    const { blocks } = htmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    const p = blocks[0] as Extract<typeof blocks[number], { type: "paragraph" }>;
    expect(p.runs).toHaveLength(3);
    expect(p.runs[0]).toEqual({ text: "📍포커루루 이벤트 페이지(", bold: true });
    expect(p.runs[1]).toEqual({ text: "https://event.pokerlulu.com/", bold: true, href: "https://event.pokerlulu.com/" });
    expect(p.runs[2]).toEqual({ text: ")", bold: true });
  });

  it("a single <li> with multiple <p> becomes one list item of multiple paragraphs", () => {
    const html = `<ul dir="auto"><li data-preset-tag="p"><p>혜택 라인</p><p><br></p><p>👍CTA 라인</p></li></ul>`;
    const { blocks } = htmlToBlocks(html);
    const list = blocks[0] as Extract<typeof blocks[number], { type: "list" }>;
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toHaveLength(3);                       // 3 paragraphs in the one item
    expect(list.items[0][0].runs[0].text).toBe("혜택 라인");
    expect(list.items[0][1].runs).toEqual([]);                  // spacer preserved
    expect(list.items[0][2].runs[0].text).toBe("👍CTA 라인");
  });

  it("whitespace-only <strong> separator is preserved (no word-join)", () => {
    const html = `<p>페이지에서<strong> </strong>예약</p>`;
    const { blocks } = htmlToBlocks(html);
    expect(blocksText(blocks)).toBe("페이지에서 예약");
  });

  it("astral math-bold and ZWJ emoji survive byte-for-byte (no normalize)", () => {
    const html = `<p>𝐌𝐀𝐗 🧑‍🎓</p>`;
    const { blocks } = htmlToBlocks(html);
    expect(blocksText(blocks)).toBe("𝐌𝐀𝐗 🧑‍🎓");
  });

  it("decodes &amp; to & in run text", () => {
    const { blocks } = htmlToBlocks(`<p>교대&amp;서초역</p>`);
    expect(blocksText(blocks)).toBe("교대&서초역");
  });

  it("empty <p><br></p> becomes a spacer paragraph (runs:[])", () => {
    const { blocks } = htmlToBlocks(`<p><br></p>`);
    expect(blocks).toEqual([{ type: "paragraph", runs: [] }]);
  });

  it("img with empty alt → decorative image, src verbatim", () => {
    const { blocks } = htmlToBlocks(`<img alt="" src="https://framerusercontent.com/x.png">`);
    expect(blocks[0]).toEqual({ type: "image", src: "https://framerusercontent.com/x.png", alt: "", decorative: true });
  });

  it("unknown tag fails closed to a single raw block and flags usedRaw", () => {
    const { blocks, usedRaw } = htmlToBlocks(`<p>ok</p><table><tr><td>x</td></tr></table>`);
    expect(usedRaw).toBe(true);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("raw");
  });
});

// THE property test — runs over every real description (loaded from the corpus dump committed as a fixture).
import fixtures from "./fixtures/program-descriptions.json"; // [{slug, description}] — created in Step 3
describe("conservation invariant over all real descriptions", () => {
  it.each(fixtures as { slug: string; description: string }[])(
    "preserves every source text node for %s",
    ({ description }) => {
      const { blocks } = htmlToBlocks(description);
      // raw fallback also conserves (raw stores the whole doc), so compare against the source.
      const rawBlock = blocks.find((b) => b.type === "raw") as { type: "raw"; html: string } | undefined;
      const out = rawBlock ? sourceText(rawBlock.html) : blocksText(blocks);
      expect(out).toBe(sourceText(description));
    }
  );
});
