// Pure serialization of editor HTML into the description_blocks storage
// contract. An empty editor stores [] (public page falls back); otherwise the
// whole document is one raw block, sanitized again server-side on save.
import type { Block } from "@/lib/program-blocks";

export function serializeBlocks(html: string, isEmpty: boolean): string {
  const blocks: Block[] = isEmpty ? [] : [{ type: "raw", html }];
  return JSON.stringify(blocks);
}
