import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProgramBlocks } from "@/components/program/ProgramBlocks";
import type { Block } from "@/lib/program-blocks";

describe("ProgramBlocks", () => {
  it("renders paragraphs, bold, bold-links with rel, lists, and images", () => {
    const blocks: Block[] = [
      { type: "image", src: "https://x/p.png", alt: "", decorative: true },
      { type: "paragraph", runs: [{ text: "보통 " }, { text: "굵게", bold: true }] },
      { type: "paragraph", runs: [{ text: "교대&서초역" }] },
      { type: "list", items: [[{ runs: [{ text: "항목1" }] }, { runs: [{ text: "줄2" }] }]] },
      { type: "paragraph", runs: [{ text: "링크", bold: true, href: "https://e.com/" }] },
    ];
    const { container } = render(<ProgramBlocks blocks={blocks} />);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(container.querySelector("strong")?.textContent).toBe("굵게");
    expect(container.textContent).toContain("교대&서초역"); // not double-encoded
    const li = container.querySelector("li");
    expect(li?.querySelectorAll("p")).toHaveLength(2);       // multi-paragraph list item
    const a = container.querySelector("a");
    expect(a?.getAttribute("href")).toBe("https://e.com/");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a?.querySelector("strong")?.textContent).toBe("링크"); // bold-link → <a><strong>
  });
  it("renders an empty paragraph (spacer) as <p>", () => {
    const { container } = render(<ProgramBlocks blocks={[{ type: "paragraph", runs: [] }]} />);
    expect(container.querySelector("p")).not.toBeNull();
  });
});
