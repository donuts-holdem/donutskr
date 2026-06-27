export interface Run { text: string; bold?: boolean; href?: string }
export interface Paragraph { runs: Run[] }
export type Block =
  | { type: "image"; src: string; alt: string; decorative?: boolean }
  | { type: "paragraph"; runs: Run[] }
  | { type: "list"; items: Paragraph[][] }
  | { type: "raw"; html: string };

function runsText(runs: Run[]): string { return runs.map((r) => r.text).join(""); }

/** In-order concatenation of every run's text — the left side of the conservation invariant. */
export function blocksText(blocks: Block[]): string {
  let out = "";
  for (const b of blocks) {
    if (b.type === "paragraph") out += runsText(b.runs);
    else if (b.type === "list") for (const item of b.items) for (const p of item) out += runsText(p.runs);
    // image contributes no text; raw text is compared separately by the converter via its own DOM walk
  }
  return out;
}

export function hasVisibleContent(blocks: Block[]): boolean {
  return blocks.some((b) => {
    if (b.type === "image" || b.type === "raw") return true;
    if (b.type === "paragraph") return b.runs.some((r) => r.text.trim() !== "");
    return b.items.some((item) => item.some((p) => p.runs.some((r) => r.text.trim() !== "")));
  });
}
