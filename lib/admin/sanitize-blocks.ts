import sanitizeHtml from "sanitize-html";
import type { Block } from "@/lib/program-blocks";
import { PROGRAM_SANITIZE_CONFIG } from "@/lib/program-sanitize";

// WYSIWYG stores the whole document as one raw block. Sanitize it on save so a
// dangerouslySetInnerHTML sink is never fed unsanitized stored HTML.
export function sanitizeRawBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) =>
    b.type === "raw" ? { type: "raw" as const, html: sanitizeHtml(b.html, PROGRAM_SANITIZE_CONFIG) } : b,
  );
}
