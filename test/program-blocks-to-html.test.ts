import { describe, it, expect } from "vitest";
import { blocksToHtml } from "@/lib/program-blocks-to-html";
import type { Block } from "@/lib/program-blocks";

describe("blocksToHtml", () => {
  it("plain paragraph → <p>", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [{ text: "hello" }] }])).toBe("<p>hello</p>");
  });

  it("bold run → <strong>", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [{ text: "굵게", bold: true }] }])).toBe(
      "<p><strong>굵게</strong></p>",
    );
  });

  it("href run → <a> with target/rel", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [{ text: "링크", href: "https://x.com" }] }])).toBe(
      '<p><a href="https://x.com" target="_blank" rel="noopener noreferrer">링크</a></p>',
    );
  });

  it("bold + href → nested <a><strong>", () => {
    expect(
      blocksToHtml([{ type: "paragraph", runs: [{ text: "t", bold: true, href: "https://x.com" }] }]),
    ).toBe('<p><a href="https://x.com" target="_blank" rel="noopener noreferrer"><strong>t</strong></a></p>');
  });

  it("empty runs → <p><br></p>", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [] }])).toBe("<p><br></p>");
  });

  it("list → <ul><li><p>", () => {
    const block: Block = { type: "list", items: [[{ runs: [{ text: "a" }] }], [{ runs: [{ text: "b" }] }]] };
    expect(blocksToHtml([block])).toBe("<ul><li><p>a</p></li><li><p>b</p></li></ul>");
  });

  it("image → <img>", () => {
    expect(blocksToHtml([{ type: "image", src: "a.jpg", alt: "설명" }])).toBe('<img src="a.jpg" alt="설명">');
  });

  it("raw → html passthrough", () => {
    expect(blocksToHtml([{ type: "raw", html: "<p>x</p>" }])).toBe("<p>x</p>");
  });

  it("escapes HTML-special characters in text", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [{ text: "<b>&\"" }] }])).toBe("<p>&lt;b&gt;&amp;&quot;</p>");
  });

  it("joins multiple blocks in order", () => {
    expect(
      blocksToHtml([
        { type: "paragraph", runs: [{ text: "a" }] },
        { type: "image", src: "i.jpg", alt: "" },
      ]),
    ).toBe('<p>a</p><img src="i.jpg" alt="">');
  });
});
