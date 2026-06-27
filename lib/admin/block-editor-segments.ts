// UI-level representation for the program description editor. The stored shape
// is Block[] (paragraph/list/image/raw), but editing prose block-by-block is
// painful. Segments are the editor's working model: consecutive PLAIN
// paragraphs collapse into one multi-line text area, while formatted
// paragraphs (bold/href runs), lists, images and raw blocks stay as their own
// cards. This module holds the pure, deterministic Block[] <-> Segment[]
// conversion so it can be unit-tested without the DOM.

import type { Block, Run } from "@/lib/program-blocks";

type ListBlock = Extract<Block, { type: "list" }>;
type ImageBlock = Extract<Block, { type: "image" }>;
type RawBlock = Extract<Block, { type: "raw" }>;

export type Segment =
  | { kind: "text"; key: string; text: string }
  | { kind: "paragraph"; key: string; runs: Run[] }
  | { kind: "list"; key: string; block: ListBlock }
  | { kind: "image"; key: string; block: ImageBlock }
  | { kind: "raw"; key: string; block: RawBlock };

// Monotonic counter for segment keys. Module-level (client only); avoids
// Date.now()/Math.random() and guarantees uniqueness across editor instances.
let seq = 0;
export function newSegmentKey(): string {
  seq += 1;
  return `seg-${seq}`;
}

/** A paragraph is "plain" when no run carries bold or href — safe to edit as raw text. */
function isPlainParagraph(block: Block): boolean {
  return block.type === "paragraph" && block.runs.every((r) => !r.bold && !r.href);
}

function paragraphLine(runs: Run[]): string {
  return runs.map((r) => r.text).join("");
}

/** Split one text-segment's value into paragraph blocks; blank lines become empty paragraphs. */
function textToParagraphs(text: string): Block[] {
  if (text === "") return [];
  return text.split("\n").map((line) => ({
    type: "paragraph" as const,
    runs: line === "" ? [] : [{ text: line }],
  }));
}

export function blocksToSegments(blocks: Block[]): Segment[] {
  const segments: Segment[] = [];
  let pending: string[] = [];

  const flush = () => {
    if (pending.length > 0) {
      segments.push({ kind: "text", key: newSegmentKey(), text: pending.join("\n") });
      pending = [];
    }
  };

  for (const block of blocks) {
    if (block.type === "paragraph" && isPlainParagraph(block)) {
      pending.push(paragraphLine(block.runs));
    } else if (block.type === "paragraph") {
      flush();
      segments.push({ kind: "paragraph", key: newSegmentKey(), runs: block.runs });
    } else {
      flush();
      segments.push({ kind: block.type, key: newSegmentKey(), block } as Segment);
    }
  }
  flush();

  // Always guarantee at least one text area to type into.
  if (segments.length === 0) {
    segments.push({ kind: "text", key: newSegmentKey(), text: "" });
  }
  return segments;
}

export function segmentsToBlocks(segments: Segment[]): Block[] {
  const blocks: Block[] = [];
  for (const seg of segments) {
    if (seg.kind === "text") {
      blocks.push(...textToParagraphs(seg.text));
    } else if (seg.kind === "paragraph") {
      blocks.push({ type: "paragraph", runs: seg.runs });
    } else {
      blocks.push(seg.block);
    }
  }
  return blocks;
}
