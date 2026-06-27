import { describe, it, expect } from "vitest";
import { sanitizeRawBlocks } from "@/app/admin/actions/programs";
import type { Block } from "@/lib/program-blocks";

describe("sanitizeRawBlocks", () => {
  it("strips disallowed tags from raw block html", () => {
    const blocks: Block[] = [{ type: "raw", html: '<p>ok</p><script>alert(1)</script>' }];
    const out = sanitizeRawBlocks(blocks);
    expect(out[0]).toEqual({ type: "raw", html: "<p>ok</p>" });
  });

  it("keeps allowed formatting (strong, a, ul, img, h2)", () => {
    const html = '<h2>제목</h2><p><strong>b</strong> <a href="https://x.com">l</a></p><ul><li>i</li></ul><img src="a.jpg" alt="a" />';
    const out = sanitizeRawBlocks([{ type: "raw", html }]);
    expect(out[0].type).toBe("raw");
    const kept = (out[0] as { html: string }).html;
    expect(kept).toContain("<h2>제목</h2>");
    expect(kept).toContain("<strong>b</strong>");
    expect(kept).toContain('href="https://x.com"');
    expect(kept).toContain("<li>i</li>");
    expect(kept).toContain('src="a.jpg"');
  });

  it("leaves non-raw blocks untouched", () => {
    const blocks: Block[] = [{ type: "paragraph", runs: [{ text: "x" }] }];
    expect(sanitizeRawBlocks(blocks)).toEqual(blocks);
  });
});
