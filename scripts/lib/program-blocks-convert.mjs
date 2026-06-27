// MIRROR of lib/program-blocks-convert.ts — kept in parity by test/backfill-parity.test.ts.
// Do not edit one without the other.
import { parseFragment } from "parse5";

const KNOWN_BLOCK = new Set(["p", "ul", "img"]);

const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value;

function textNodes(n) {
  if (n.nodeName === "#text") return n.value ?? "";
  return (n.childNodes ?? []).map(textNodes).join("");
}

class UnsupportedNode extends Error {}

// Build runs from a paragraph/inline subtree, threading bold/href marks down.
function inlineRuns(nodes, marks, out) {
  for (const n of nodes) {
    if (n.nodeName === "#text") {
      if ((n.value ?? "") !== "") {
        out.push({
          text: n.value,
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

function paragraphFrom(p) {
  const runs = [];
  inlineRuns(p.childNodes ?? [], {}, runs);
  return { runs };
}

function liToParagraphs(li) {
  const ps = [];
  for (const c of li.childNodes ?? []) {
    if (c.tagName === "p") {
      ps.push(paragraphFrom(c));
    } else if (c.nodeName === "#text") {
      if ((c.value ?? "").trim() !== "") {
        ps.push({ runs: [{ text: c.value }] });
      }
    } else {
      throw new UnsupportedNode(c.tagName ?? c.nodeName);
    }
  }
  return ps;
}

// Inlined from lib/program-blocks.ts (blocksText).
function runsText(runs) {
  return runs.map((r) => r.text).join("");
}

function blocksText(blocks) {
  let out = "";
  for (const b of blocks) {
    if (b.type === "paragraph") out += runsText(b.runs);
    else if (b.type === "list")
      for (const item of b.items) for (const p of item) out += runsText(p.runs);
    // image contributes no text; raw text is compared separately by the converter via its own DOM walk
  }
  return out;
}

export function htmlToBlocks(html) {
  const fragment = parseFragment(html);
  const rawFallback = () => ({
    blocks: [{ type: "raw", html }],
    usedRaw: true,
  });

  let blocks;
  try {
    blocks = [];
    for (const n of fragment.childNodes) {
      if (n.nodeName === "#text") {
        if ((n.value ?? "").trim() !== "") {
          blocks.push({ type: "paragraph", runs: [{ text: n.value }] });
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
