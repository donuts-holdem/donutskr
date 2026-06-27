// Block[] → HTML string. Mirrors the public ProgramBlocks renderer so existing
// structured data loads into the WYSIWYG editor unchanged. Text is HTML-escaped;
// raw blocks pass through verbatim (they are sanitized again on save/render).
import type { Block, Paragraph, Run } from "@/lib/program-blocks";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runHtml(run: Run): string {
  let inner = run.bold ? `<strong>${esc(run.text)}</strong>` : esc(run.text);
  if (run.href) {
    inner = `<a href="${esc(run.href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
  }
  return inner;
}

function paragraphHtml(p: Paragraph): string {
  if (p.runs.length === 0) return "<p><br></p>";
  return `<p>${p.runs.map(runHtml).join("")}</p>`;
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((b): string => {
      switch (b.type) {
        case "paragraph":
          return paragraphHtml({ runs: b.runs });
        case "list":
          return `<ul>${b.items.map((item) => `<li>${item.map(paragraphHtml).join("")}</li>`).join("")}</ul>`;
        case "image":
          return `<img src="${esc(b.src)}" alt="${esc(b.alt)}">`;
        case "raw":
          return b.html;
      }
    })
    .join("");
}
