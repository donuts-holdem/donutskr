import { parseFragment } from "parse5";
import type { Block, Paragraph, Run } from "@/lib/program-blocks";
import { blocksText } from "@/lib/program-blocks";

type Node = {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Node[];
};

const KNOWN_BLOCK = new Set(["p", "ul", "img"]);

const attr = (n: Node, name: string) => n.attrs?.find((a) => a.name === name)?.value;

function textNodes(n: Node): string {
  if (n.nodeName === "#text") return n.value ?? "";
  return (n.childNodes ?? []).map(textNodes).join("");
}

class UnsupportedNode extends Error {}

// Build runs from a paragraph/inline subtree, threading bold/href marks down.
function inlineRuns(nodes: Node[], marks: { bold?: boolean; href?: string }, out: Run[]) {
  for (const n of nodes) {
    if (n.nodeName === "#text") {
      if ((n.value ?? "") !== "") {
        out.push({
          text: n.value!,
          ...(marks.bold ? { bold: true } : {}),
          ...(marks.href ? { href: marks.href } : {}),
        });
      }
    } else if (n.tagName === "br") {
      // contributes no text node; ignored (a <p><br></p> yields an empty runs[] = spacer)
    } else if (n.tagName === "strong" || n.tagName === "b") {
      inlineRuns(n.childNodes ?? [], { ...marks, bold: true }, out);
    } else if (n.tagName === "a") {
      inlineRuns(n.childNodes ?? [], { ...marks, href: attr(n, "href") ?? marks.href }, out);
    } else {
      throw new UnsupportedNode(n.tagName ?? n.nodeName);
    }
  }
}

function paragraphFrom(p: Node): Paragraph {
  const runs: Run[] = [];
  inlineRuns(p.childNodes ?? [], {}, runs);
  return { runs };
}

function liToParagraphs(li: Node): Paragraph[] {
  const ps: Paragraph[] = [];
  for (const c of li.childNodes ?? []) {
    if (c.tagName === "p") {
      ps.push(paragraphFrom(c));
    } else if (c.nodeName === "#text") {
      if ((c.value ?? "").trim() !== "") {
        ps.push({ runs: [{ text: c.value! }] });
      }
    } else {
      throw new UnsupportedNode(c.tagName ?? c.nodeName);
    }
  }
  return ps;
}

export function htmlToBlocks(html: string): { blocks: Block[]; usedRaw: boolean } {
  const fragment = parseFragment(html) as unknown as { childNodes: Node[] };
  const rawFallback = (): { blocks: Block[]; usedRaw: boolean } => ({
    blocks: [{ type: "raw", html }],
    usedRaw: true,
  });

  let blocks: Block[];
  try {
    blocks = [];
    for (const n of fragment.childNodes) {
      if (n.nodeName === "#text") {
        if ((n.value ?? "").trim() !== "") {
          blocks.push({ type: "paragraph", runs: [{ text: n.value! }] });
        }
        continue;
      }
      const tag = n.tagName ?? "";
      if (!KNOWN_BLOCK.has(tag)) {
        throw new UnsupportedNode(tag);
      }
      if (tag === "img") {
        const alt = attr(n, "alt") ?? "";
        blocks.push({
          type: "image",
          src: attr(n, "src") ?? "",
          alt,
          ...(alt === "" ? { decorative: true } : {}),
        });
      } else if (tag === "p") {
        blocks.push({ type: "paragraph", runs: paragraphFrom(n).runs });
      } else if (tag === "ul") {
        const items = (n.childNodes ?? [])
          .filter((c) => c.tagName === "li")
          .map(liToParagraphs);
        blocks.push({ type: "list", items });
      }
    }
  } catch (e) {
    if (e instanceof UnsupportedNode) return rawFallback();
    throw e;
  }

  // Conservation invariant — the airtight guard. On any mismatch, fail closed to whole-doc raw.
  const src = fragment.childNodes.map(textNodes).join("");
  if (blocksText(blocks) !== src) return rawFallback();

  return { blocks, usedRaw: false };
}
