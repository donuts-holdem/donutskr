# Admin Phase 5 — Program Description Block Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the raw-HTML-paste program-description textarea with a structured block editor a non-developer can use, migrating the 23 existing descriptions with provably zero content loss and a per-program, reversible cutover.

**Architecture:** A pure block model (`lib/program-blocks.ts`) + a parse5 HTML→blocks converter guarded by a text-conservation invariant (`lib/program-blocks-convert.ts`) + a React block renderer (`components/program/ProgramBlocks.tsx`). Storage is additive: new `description_blocks jsonb` + `description_verified boolean`, legacy `description` text retained. The public renderer renders blocks only when `verified && non-empty && has-visible-content`, else the existing `marked`/`sanitizeHtml` path. A heterogeneous block editor (`components/admin/BlockEditor.tsx`) on the Phase-1 `useRepeatableRows` hook edits blocks; an idempotent migration script populates blocks (verified stays false until a human reviews side-by-side).

**Tech Stack:** Next.js App Router (read `node_modules/next/dist/docs/` before route work), RSC + Server Actions, parse5, Supabase, Tailwind v4 + shadcn, Vitest (jsdom, no DB).

## Design of record — refinements from expert (designer + QA) review

These SUPERSEDE the spec (§Phase 5) where they conflict; the spec's model was corrected against the real 23-description corpus:

1. **List-item model fix (CRITICAL):** the spec's `list{items: runs[]}` is wrong — 8 real `<li>` hold 2–5 `<p>`. A list item is an **array of paragraphs**. Model: `list{ items: Paragraph[][] }` (items = ordered list items; each item = ordered paragraphs).
2. **Composable runs:** `Run = { text: string; bold?: boolean; href?: string }` — one run type expresses plain / bold / link / bold-link (the real `<a><strong>` data).
3. **Drop `heading`** from v1 (0 in data). Block union = `image | paragraph | list | raw`.
4. **Text is opaque:** the converter NEVER trims run text, NEVER `normalize()`s (would destroy astral math-bold `𝐌𝐀𝐗`), NEVER splits codepoints. Whitespace-only `<strong> </strong>` is load-bearing and must survive.
5. **Spacers preserved:** `<p><br></p>` → empty `paragraph{runs:[]}` (NOT collapsed) so the block render matches the legacy `marked` spacing and the side-by-side review is trustworthy.
6. **Text-conservation invariant = runtime guard:** `concat(all source text nodes, entity-decoded, untrimmed) === concat(all output run.text)` AND `count(img.src) preserved`. On mismatch the converter returns a single whole-document `raw{html}` block (trivially conserving) and flags the program. This is enforced in code, not just tested.
7. **Fail-closed:** any tag outside the known set (`p, ul, li, strong, b, a, img, br`) → the document goes to `raw` and the program stays unverified. Never drop a node.
8. **Conversion is migration-time only** — never on the public render path (keeps parse5 off the request path and preserves the human gate).
9. **Render gate:** blocks render publicly only when `description_verified === true && Array.isArray(blocks) && blocks.length > 0 && hasVisibleContent(blocks)`; else legacy. Prevents an empty-but-verified wipe.
10. **Images:** existing `alt=""` → `decorative: true` (lossless; don't force junk alt). New uploads: alt optional + a `장식용 이미지` checkbox; soft nudge (never hard block) when a non-decorative image lacks alt. Per-block image upload uses **indexed file inputs** (`block_image_<i>_file`) reconciled server-side.
11. **`raw` block** is read-only, non-deletable, reorder-only, with a `개발자 확인 필요` warning + copy button.
12. **Verify is its own gated action**, separate from 저장 — side-by-side legacy-vs-block preview + `검토했습니다` checkbox → AlertDialog → flips `verified`. Reversible (un-verify).

## Global Constraints

- Import alias `@/` only. Default to Server Components; `"use client"` only when necessary.
- **Zero content loss is the overriding requirement.** The conservation invariant (above) is mandatory and enforced at runtime. Legacy `description` is RETAINED and remains the source of truth + public fallback until a program is verified.
- Admin uses shadcn primitives + the shadcn token layer; the PUBLIC renderer uses the bespoke `.prose-dark` shapes (so verified output is visually identical to legacy). Design tokens only.
- Serialization reuses `lib/admin/structured-fields.ts`: editors emit a JSON string in a hidden input; `parseJsonField` throws `StructuredFieldError` on malformed JSON (→ `app/admin/error.tsx`); a new strict `coerceDescriptionBlocks` normalizes partial/legacy shapes and NEVER silently empties.
- parse5 runs only at migration time + in tests, never on the public render path.
- DB changes are additive + reversible (2 nullable columns; legacy column kept). The prod DDL is run by the user via the Supabase SQL editor (exact SQL in Task 8); the migration script writes data only (null-only, dry-run default, `--apply`-gated).
- Korean copy for operator-facing strings. Tests are pure jsdom units (no DB); `npm test` green, `tsc` clean, eslint 0 warnings on changed files.
- Keyboard editor controls use `KeyboardEvent.code` (not `event.key`) if any are added (Korean IME).

## File Structure

**Create:**
- `lib/program-blocks.ts` — block/run types + `hasVisibleContent` + `blocksText` (text-extraction helper).
- `lib/program-blocks-convert.ts` — `htmlToBlocks(html): { blocks: Block[]; usedRaw: boolean }` (parse5, fail-closed, invariant-guarded).
- `components/program/ProgramBlocks.tsx` — block renderer (React → `.prose-dark` shapes).
- `components/admin/BlockEditor.tsx` (+ small sub-components) — heterogeneous block editor (`"use client"`).
- `scripts/backfill-program-blocks.mjs` — idempotent null-only migration (controller-run).
- Tests: `test/program-blocks.test.ts`, `test/program-blocks-convert.test.ts`, `test/program-blocks-render.test.tsx`, `test/block-editor.test.tsx`.

**Modify:**
- `lib/admin/structured-fields.ts` — add `coerceDescriptionBlocks`.
- `lib/types.ts` — add `description_blocks: Block[] | null; description_verified: boolean` to `Program`.
- `lib/data/programs.ts` — map the two new columns in `mapProgram`.
- `app/(site)/programs/[slug]/page.tsx` — render gate (blocks vs legacy).
- `components/admin/ProgramForm.tsx` — replace the description textarea with `BlockEditor`; keep legacy `description` as a preserved hidden field; add the verify UX.
- `app/admin/actions/programs.ts` — serialize `description_blocks`, indexed image-upload reconciliation, a separate `setProgramVerified` action.

---

## Task 1: Block model types, helpers, and strict coerce

**Files:**
- Create: `lib/program-blocks.ts`, `test/program-blocks.test.ts`
- Modify: `lib/admin/structured-fields.ts`
- Test: `test/program-blocks.test.ts`

**Interfaces — Produces:**
```ts
export interface Run { text: string; bold?: boolean; href?: string }
export interface Paragraph { runs: Run[] }                  // runs:[] = spacer
export type Block =
  | { type: "image"; src: string; alt: string; decorative?: boolean }
  | { type: "paragraph"; runs: Run[] }
  | { type: "list"; items: Paragraph[][] }                  // items = list items; each item = paragraphs
  | { type: "raw"; html: string };
export function blocksText(blocks: Block[]): string;        // in-order concat of all run text (for the invariant)
export function hasVisibleContent(blocks: Block[]): boolean;
export function coerceDescriptionBlocks(value: unknown): Block[];  // in structured-fields.ts
```

- [ ] **Step 1: Write the failing tests** — `test/program-blocks.test.ts` covering `blocksText`, `hasVisibleContent`, and `coerceDescriptionBlocks`:

```ts
import { describe, it, expect } from "vitest";
import { blocksText, hasVisibleContent, type Block } from "@/lib/program-blocks";
import { coerceDescriptionBlocks } from "@/lib/admin/structured-fields";

const para = (t: string): Block => ({ type: "paragraph", runs: [{ text: t }] });

describe("blocksText", () => {
  it("concatenates run text across paragraphs, lists, and raw", () => {
    const blocks: Block[] = [
      { type: "image", src: "x", alt: "" },
      para("A"),
      { type: "list", items: [[{ runs: [{ text: "B" }, { text: "C" }] }], [{ runs: [{ text: "D" }] }]] },
    ];
    expect(blocksText(blocks)).toBe("ABCD");
  });
});

describe("hasVisibleContent", () => {
  it("true when any image or non-empty run exists", () => {
    expect(hasVisibleContent([{ type: "image", src: "x", alt: "" }])).toBe(true);
    expect(hasVisibleContent([para("hi")])).toBe(true);
  });
  it("false for empty or spacer-only blocks", () => {
    expect(hasVisibleContent([])).toBe(false);
    expect(hasVisibleContent([{ type: "paragraph", runs: [] }])).toBe(false);
    expect(hasVisibleContent([{ type: "paragraph", runs: [{ text: "  " }] }])).toBe(false);
  });
});

describe("coerceDescriptionBlocks", () => {
  it("returns [] for non-arrays", () => {
    expect(coerceDescriptionBlocks(null)).toEqual([]);
    expect(coerceDescriptionBlocks("x")).toEqual([]);
  });
  it("normalizes partial run shapes (missing flags, string bold)", () => {
    const out = coerceDescriptionBlocks([{ type: "paragraph", runs: [{ text: "a", bold: "true", href: "" }, { foo: 1 }] }]);
    expect(out).toEqual([{ type: "paragraph", runs: [{ text: "a", bold: true }, { text: "" }] }]);
  });
  it("keeps image src/alt/decorative and list paragraph nesting", () => {
    expect(coerceDescriptionBlocks([{ type: "image", src: "s", alt: "", decorative: true }]))
      .toEqual([{ type: "image", src: "s", alt: "", decorative: true }]);
    expect(coerceDescriptionBlocks([{ type: "list", items: [[{ runs: [{ text: "x" }] }]] }]))
      .toEqual([{ type: "list", items: [[{ runs: [{ text: "x" }] }]] }]);
  });
  it("preserves an unknown block type as raw rather than dropping it", () => {
    const out = coerceDescriptionBlocks([{ type: "whoops", html: "<table></table>" }]);
    expect(out[0].type).toBe("raw");
  });
  it("keeps raw html verbatim", () => {
    expect(coerceDescriptionBlocks([{ type: "raw", html: "<x>" }])).toEqual([{ type: "raw", html: "<x>" }]);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run test/program-blocks.test.ts` → FAIL.

- [ ] **Step 3: Implement `lib/program-blocks.ts`:**

```ts
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
```

- [ ] **Step 4: Implement `coerceDescriptionBlocks` in `lib/admin/structured-fields.ts`** (append; import the `Block`/`Run`/`Paragraph` types from `@/lib/program-blocks`). Tolerate partial shapes; never silently drop a block — unknown `type` → `raw`:

```ts
import type { Block, Run, Paragraph } from "@/lib/program-blocks";

function coerceRun(el: unknown): Run {
  const o = asObject(el);
  const run: Run = { text: str(o.text) };
  if (o.bold === true || o.bold === "true") run.bold = true;
  if (typeof o.href === "string" && o.href.trim() !== "") run.href = o.href;
  return run;
}
function coerceParagraph(el: unknown): Paragraph {
  const o = asObject(el);
  return { runs: Array.isArray(o.runs) ? o.runs.map(coerceRun) : [] };
}
export function coerceDescriptionBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  return value.map((el): Block => {
    const o = asObject(el);
    switch (o.type) {
      case "image":
        return { type: "image", src: str(o.src), alt: str(o.alt), ...(o.decorative === true ? { decorative: true } : {}) };
      case "paragraph":
        return { type: "paragraph", runs: Array.isArray(o.runs) ? o.runs.map(coerceRun) : [] };
      case "list":
        return { type: "list", items: Array.isArray(o.items) ? o.items.map((it) => (Array.isArray(it) ? it.map(coerceParagraph) : [])) : [] };
      case "raw":
        return { type: "raw", html: str(o.html) };
      default:
        return { type: "raw", html: str(o.html) };
    }
  });
}
```

- [ ] **Step 5: Run, verify pass** — `npx vitest run test/program-blocks.test.ts` → PASS.

- [ ] **Step 6: Verify + commit**

```bash
npx tsc --noEmit && npx eslint lib/program-blocks.ts lib/admin/structured-fields.ts test/program-blocks.test.ts && npm test
git add lib/program-blocks.ts lib/admin/structured-fields.ts test/program-blocks.test.ts
git commit -m "feat(blocks): program block model, helpers, strict coerce"
```

---

## Task 2: HTML→blocks converter (parse5) with conservation invariant

**Files:**
- Create: `lib/program-blocks-convert.ts`, `test/program-blocks-convert.test.ts`
- Modify: `package.json` (add `parse5`)
- Test: `test/program-blocks-convert.test.ts`

**Interfaces — Produces:** `htmlToBlocks(html: string): { blocks: Block[]; usedRaw: boolean }`.
- `usedRaw` is true when any `raw` block was emitted (unknown tag OR invariant fallback) — the migration uses it to flag a program for human attention.

- [ ] **Step 1: Add parse5** — `npm install parse5`. Confirm it lands in `dependencies`.

- [ ] **Step 2: Write the failing tests with REAL fixtures** — `test/program-blocks-convert.test.ts`. Use the actual strings from prod (key cases from the QA audit). The single most important test is the conservation property:

```ts
import { describe, it, expect } from "vitest";
import { htmlToBlocks } from "@/lib/program-blocks-convert";
import { blocksText } from "@/lib/program-blocks";

// text nodes of an HTML string, entity-decoded, in order — the invariant's right side.
import { parseFragment } from "parse5";
function sourceText(html: string): string {
  let out = "";
  const walk = (node: any) => {
    if (node.nodeName === "#text") out += node.value;
    for (const c of node.childNodes ?? []) walk(c);
  };
  for (const c of parseFragment(html).childNodes) walk(c);
  return out;
}

describe("htmlToBlocks — real fixtures", () => {
  it("bold+link composes into one run with both marks (3 runs total)", () => {
    const html = `<p dir="auto"><strong>📍포커루루 이벤트 페이지(</strong><a href="https://event.pokerlulu.com/" target="_blank"><strong>https://event.pokerlulu.com/</strong></a><strong>)</strong></p>`;
    const { blocks } = htmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    const p = blocks[0] as Extract<typeof blocks[number], { type: "paragraph" }>;
    expect(p.runs).toHaveLength(3);
    expect(p.runs[0]).toEqual({ text: "📍포커루루 이벤트 페이지(", bold: true });
    expect(p.runs[1]).toEqual({ text: "https://event.pokerlulu.com/", bold: true, href: "https://event.pokerlulu.com/" });
    expect(p.runs[2]).toEqual({ text: ")", bold: true });
  });

  it("a single <li> with multiple <p> becomes one list item of multiple paragraphs", () => {
    const html = `<ul dir="auto"><li data-preset-tag="p"><p>혜택 라인</p><p><br></p><p>👍CTA 라인</p></li></ul>`;
    const { blocks } = htmlToBlocks(html);
    const list = blocks[0] as Extract<typeof blocks[number], { type: "list" }>;
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toHaveLength(3);                       // 3 paragraphs in the one item
    expect(list.items[0][0].runs[0].text).toBe("혜택 라인");
    expect(list.items[0][1].runs).toEqual([]);                  // spacer preserved
    expect(list.items[0][2].runs[0].text).toBe("👍CTA 라인");
  });

  it("whitespace-only <strong> separator is preserved (no word-join)", () => {
    const html = `<p>페이지에서<strong> </strong>예약</p>`;
    const { blocks } = htmlToBlocks(html);
    expect(blocksText(blocks)).toBe("페이지에서 예약");
  });

  it("astral math-bold and ZWJ emoji survive byte-for-byte (no normalize)", () => {
    const html = `<p>𝐌𝐀𝐗 🧑‍🎓</p>`;
    const { blocks } = htmlToBlocks(html);
    expect(blocksText(blocks)).toBe("𝐌𝐀𝐗 🧑‍🎓");
  });

  it("decodes &amp; to & in run text", () => {
    const { blocks } = htmlToBlocks(`<p>교대&amp;서초역</p>`);
    expect(blocksText(blocks)).toBe("교대&서초역");
  });

  it("empty <p><br></p> becomes a spacer paragraph (runs:[])", () => {
    const { blocks } = htmlToBlocks(`<p><br></p>`);
    expect(blocks).toEqual([{ type: "paragraph", runs: [] }]);
  });

  it("img with empty alt → decorative image, src verbatim", () => {
    const { blocks } = htmlToBlocks(`<img alt="" src="https://framerusercontent.com/x.png">`);
    expect(blocks[0]).toEqual({ type: "image", src: "https://framerusercontent.com/x.png", alt: "", decorative: true });
  });

  it("unknown tag fails closed to a single raw block and flags usedRaw", () => {
    const { blocks, usedRaw } = htmlToBlocks(`<p>ok</p><table><tr><td>x</td></tr></table>`);
    expect(usedRaw).toBe(true);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("raw");
  });
});

// THE property test — runs over every real description (loaded from the corpus dump committed as a fixture).
import fixtures from "./fixtures/program-descriptions.json"; // [{slug, description}] — created in Step 3
describe("conservation invariant over all real descriptions", () => {
  it.each(fixtures as { slug: string; description: string }[])(
    "preserves every source text node for %s",
    ({ description }) => {
      const { blocks } = htmlToBlocks(description);
      // raw fallback also conserves (raw stores the whole doc), so compare against the source.
      const out = blocks.some((b) => b.type === "raw")
        ? sourceText((blocks.find((b) => b.type === "raw") as any).html)
        : blocksText(blocks);
      expect(out).toBe(sourceText(description));
    }
  );
});
```

- [ ] **Step 3: Create the fixtures file** — `test/fixtures/program-descriptions.json` = an array of `{slug, description}` for all 23 programs. The controller provides this dump (the descriptions were already read from prod; see the migration investigation). Commit it as a test fixture so the property test is reproducible offline.

- [ ] **Step 4: Run, verify fail** — `npx vitest run test/program-blocks-convert.test.ts` → FAIL.

- [ ] **Step 5: Implement `lib/program-blocks-convert.ts`** using parse5. Walk top-level nodes; build runs from inline nodes carrying composable marks; unwrap `<li>`'s `<p>` children into paragraphs; treat any unknown tag by bailing the whole document to one `raw` block. After building, compute the conservation invariant (`blocksText(blocks) === sourceText(html)`); on mismatch, return a single whole-document `raw` block. The known inline set is `strong, b, a, br`; known block set is `p, ul, img`. Helper `sourceText` extracts all text nodes (entity-decoded by parse5). Key shape:

```ts
import { parseFragment, serialize } from "parse5";
import type { Block, Paragraph, Run } from "@/lib/program-blocks";
import { blocksText } from "@/lib/program-blocks";

type Node = { nodeName: string; tagName?: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: Node[] };
const KNOWN_BLOCK = new Set(["p", "ul", "img"]);
const KNOWN_INLINE = new Set(["strong", "b", "a", "br"]);
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
      if ((n.value ?? "") !== "") out.push({ text: n.value!, ...(marks.bold ? { bold: true } : {}), ...(marks.href ? { href: marks.href } : {}) });
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
function paragraphFrom(p: Node): Paragraph { const runs: Run[] = []; inlineRuns(p.childNodes ?? [], {}, runs); return { runs }; }

function liToParagraphs(li: Node): Paragraph[] {
  const ps: Paragraph[] = [];
  for (const c of li.childNodes ?? []) {
    if (c.tagName === "p") ps.push(paragraphFrom(c));
    else if (c.nodeName === "#text") { if ((c.value ?? "").trim() !== "") ps.push({ runs: [{ text: c.value! }] }); }
    else throw new UnsupportedNode(c.tagName ?? c.nodeName); // strong/a/br directly in li: route doc to raw
  }
  return ps;
}

export function htmlToBlocks(html: string): { blocks: Block[]; usedRaw: boolean } {
  const fragment = parseFragment(html) as unknown as { childNodes: Node[] };
  const rawFallback = (): { blocks: Block[]; usedRaw: boolean } => ({ blocks: [{ type: "raw", html }], usedRaw: true });
  let blocks: Block[];
  try {
    blocks = [];
    for (const n of fragment.childNodes) {
      if (n.nodeName === "#text") { if ((n.value ?? "").trim() !== "") blocks.push({ type: "paragraph", runs: [{ text: n.value! }] }); continue; }
      const tag = n.tagName ?? "";
      if (tag === "img") {
        const alt = attr(n, "alt") ?? "";
        blocks.push({ type: "image", src: attr(n, "src") ?? "", alt, ...(alt === "" ? { decorative: true } : {}) });
      } else if (tag === "p") {
        blocks.push({ type: "paragraph", runs: paragraphFrom(n).runs });
      } else if (tag === "ul") {
        const items = (n.childNodes ?? []).filter((c) => c.tagName === "li").map(liToParagraphs);
        blocks.push({ type: "list", items });
      } else { throw new UnsupportedNode(tag); }
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
```
Note: `serialize` is imported for completeness if you choose to serialize subtrees; the chosen fail-safe stores the ORIGINAL `html` (simplest + guaranteed conserving). Keep it that way.

- [ ] **Step 6: Run, verify pass** — `npx vitest run test/program-blocks-convert.test.ts` → PASS, including the `it.each` over all 23 (target: **0** raw fallbacks; if any real description trips raw, investigate — it signals an unmodeled structure).

- [ ] **Step 7: Verify + commit**

```bash
npx tsc --noEmit && npx eslint lib/program-blocks-convert.ts test/program-blocks-convert.test.ts && npm test
git add lib/program-blocks-convert.ts test/program-blocks-convert.test.ts test/fixtures/program-descriptions.json package.json package-lock.json
git commit -m "feat(blocks): parse5 HTML→blocks converter with conservation invariant"
```

---

## Task 3: Block renderer component

**Files:**
- Create: `components/program/ProgramBlocks.tsx`, `test/program-blocks-render.test.tsx`
- Test: `test/program-blocks-render.test.tsx`

**Interfaces — Produces:** `ProgramBlocks({ blocks }: { blocks: Block[] })` — a Server Component emitting `.prose-dark`-shaped markup so verified output matches legacy.

- [ ] **Step 1: Write the failing test** — assert structure + that React escaping keeps `&` as text + links carry `rel`:

```tsx
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
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/program/ProgramBlocks.tsx`.** A run renders: `href` → `<a href rel="noopener noreferrer">` wrapping `bold ? <strong> : text`; else `bold` → `<strong>`; else the text string. Empty paragraph → `<p><br/></p>` (parity with legacy). `raw` → `dangerouslySetInnerHTML` of `sanitizeHtml(html, <same config as the legacy renderer>)` (defensive; verified programs target 0 raw). Wrap everything in `<div className="prose-dark text-ink/80 text-sm leading-relaxed">`. Use stable keys by index. React auto-escapes run text (so `&` is safe).

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit && npx eslint components/program/ProgramBlocks.tsx test/program-blocks-render.test.tsx && npm test
git add components/program/ProgramBlocks.tsx test/program-blocks-render.test.tsx
git commit -m "feat(blocks): ProgramBlocks renderer (prose-dark parity)"
```

---

## Task 4: Public renderer gate

**Files:**
- Modify: `lib/types.ts`, `lib/data/programs.ts`, `app/(site)/programs/[slug]/page.tsx`
- Test: none new (gate logic uses the tested `hasVisibleContent`; integration verified by build/gate)

- [ ] **Step 1: Extend the type** — `lib/types.ts` `Program`: add `description_blocks: Block[] | null;` and `description_verified: boolean;` (import `Block` from `@/lib/program-blocks`).

- [ ] **Step 2: Map the columns** — `lib/data/programs.ts` `mapProgram`: `description_blocks: coerceNullableBlocks(r.description_blocks)` and `description_verified: Boolean(r.description_verified)`. Add a tiny local `coerceNullableBlocks` that returns `null` when the column is null/absent, else `coerceDescriptionBlocks(r.description_blocks)` (import from structured-fields). (The DB returns jsonb already-parsed, so no JSON.parse.)

- [ ] **Step 3: Gate the renderer** — `app/(site)/programs/[slug]/page.tsx`: compute `const useBlocks = program.description_verified && Array.isArray(program.description_blocks) && program.description_blocks.length > 0 && hasVisibleContent(program.description_blocks);`. When `useBlocks`, render `<ProgramBlocks blocks={program.description_blocks} />` in place of the `descHtml` block; else keep the existing `marked`/`sanitizeHtml` legacy path EXACTLY as-is. (Leave `generateMetadata`'s use of `program.description` untouched — metadata still derives from the legacy text.)

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npx eslint lib/types.ts lib/data/programs.ts "app/(site)/programs/[slug]/page.tsx" && npm test
git add -A
git commit -m "feat(blocks): public renderer gate (verified blocks vs legacy fallback)"
```

> Until the columns exist in prod (Task 8) and a program is verified, `description_verified` is false everywhere → the legacy path always runs → zero public change. Safe to merge ahead of the DB migration.

---

## Task 5: Block editor (admin)

**Files:**
- Create: `components/admin/BlockEditor.tsx` (+ inline sub-components), `test/block-editor.test.tsx`
- Test: `test/block-editor.test.tsx`

**Interfaces — Produces:** `BlockEditor({ name, initial }: { name: string; initial: Block[] })` — a `"use client"` heterogeneous editor on `useRepeatableRows<Block>`, emitting the blocks as JSON in a hidden input named `name`, plus indexed image file inputs.

**Design (from the designer review):**
- Block list of shadcn `Card`s; each card body chosen by `block.type`. Per-card `↑ ↓` + `삭제` (raw: no 삭제).
- `+ 블록 추가` opens a small type picker: 문단 / 목록 / 이미지 (NOT raw, NOT heading).
- **Paragraph editor:** a single plain `Input` for the common all-plain case; a `서식` toggle expands a segmented runs editor — an ordered list of segments, each `[text Input] [굵게 Toggle] [🔗 → URL Input]`, with `+ 조각`/삭제. (Plain inputs only — IME-safe; no contentEditable.)
- **List editor:** a repeatable of items; each item is a repeatable of paragraphs (reuse the paragraph editor). (For v1 a list item may be edited as its paragraphs; keep nesting shallow and usable.)
- **Image block:** `ImagePreview` + `src` hidden/display + a file input named `block_image_<index>_file` + `alt` Input + `장식용 이미지` Checkbox.
- **Raw block:** read-only Card, `border-destructive/40`, `개발자 확인 필요` Badge, `<pre>` of the html, a 복사 button; reorder-only.
- On every change, serialize the current `Block[]` to the hidden input via `JSON.stringify`.

- [ ] **Step 1: Write tests for the pure/serialization behavior** — `test/block-editor.test.tsx`: render with an initial mix (image+paragraph+list+raw); assert the hidden input's JSON parses back (via `coerceDescriptionBlocks`) to the initial blocks; adding a 문단 block then typing updates the hidden JSON; toggling 굵게 on a segment sets `bold:true`; the raw card has no 삭제 control. Use `@testing-library/react` + the jsdom polyfills already in `test/setup.ts`. Keep assertions behavioral (hidden input value), not snapshot.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/admin/BlockEditor.tsx`** per the design above, on `useRepeatableRows<Block>`. The hidden input name is `name`; image file inputs are `block_image_<i>_file` where `<i>` is the block's index among IMAGE blocks (0-based) — the action reconciles by that same index. Keep sub-components in the one file unless it grows past ~300 lines.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit && npx eslint components/admin/BlockEditor.tsx test/block-editor.test.tsx && npm test
git add components/admin/BlockEditor.tsx test/block-editor.test.tsx
git commit -m "feat(admin): heterogeneous block editor for program descriptions"
```

---

## Task 6: ProgramForm integration + actions

**Files:**
- Modify: `components/admin/ProgramForm.tsx`, `app/admin/actions/programs.ts`
- Test: none new (serialization covered by Task 1/5; action is integration — verified by build/gate)

- [ ] **Step 1: Swap the description field** — in `ProgramForm.tsx`, replace the description `Textarea` with `<BlockEditor name="description_blocks" initial={program?.description_blocks ?? []} />`. Keep the legacy `description` as a PRESERVED hidden input (`<input type="hidden" name="description" value={program?.description ?? ""} />`) so the legacy column and the verify fallback are never lost. Label the editor "설명 (블록)".

- [ ] **Step 2: Persist blocks + reconcile indexed images** — in `app/admin/actions/programs.ts` (`createProgram`/`updateProgram`):
  - Parse `description_blocks` via `parseJsonField(fd.get("description_blocks"), "description_blocks")` → `coerceDescriptionBlocks(...)`.
  - For each IMAGE block, in index order, if `fd.get("block_image_<i>_file")` is a non-empty File, upload via `uploadIfPresent` (existing) and replace that block's `src` with the returned URL; else keep the block's existing `src`.
  - Write `description_blocks` (the reconciled array) to the row. Do NOT change `description_verified` here (saving never verifies). Do NOT drop the legacy `description` column (write the preserved hidden value back).
  - Keep all other ProgramForm fields exactly as today.

- [ ] **Step 3: Add the verify toggle action** — a new `setProgramVerified(id: string, verified: boolean)` server action in `programs.ts`: `requireAdmin`, `update({ description_verified: verified })`, `revalidatePublic([`/programs/${slug}`])`, `redirect("/admin/programs/<id>/edit?saved=1")`. (Slug lookup: fetch the program or pass slug in.)

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npx eslint components/admin/ProgramForm.tsx app/admin/actions/programs.ts && npm test
git add -A
git commit -m "feat(admin): block editor in ProgramForm + persist blocks, indexed image upload, verify action"
```

---

## Task 7: Per-program cutover (side-by-side + gated verify)

**Files:**
- Modify: `app/admin/(protected)/programs/[id]/edit/page.tsx`
- Create: `components/admin/VerifyCutover.tsx` (`"use client"`)
- Test: none new (UX; verified by gate)

- [ ] **Step 1: Side-by-side preview + gated verify** — on the program EDIT page (existing program only), when `description_blocks` is present and `!description_verified`, render a `VerifyCutover` block: left = the legacy `marked`/`sanitizeHtml` render (reuse the same pipeline as the public page) of `description`; right = `<ProgramBlocks blocks={description_blocks} />`. Below: a `검토했습니다` checkbox that enables a `검증 완료 — 블록으로 전환` button; clicking opens a shadcn `AlertDialog` ("이 프로그램의 공개 페이지가 블록 렌더러로 전환됩니다.") → confirm calls `setProgramVerified(id, true)`. When already verified, show a `블록으로 노출 중` badge + an `기존 방식으로 되돌리기` (un-verify) control calling `setProgramVerified(id, false)`. The verify controls are SEPARATE from the form's 저장 button.

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npx eslint "app/admin/(protected)/programs/[id]/edit/page.tsx" components/admin/VerifyCutover.tsx && npm test
git add -A
git commit -m "feat(admin): per-program block cutover with side-by-side review + gated verify"
```

---

## Task 8: DB columns + migration script

**Files:**
- Create: `scripts/backfill-program-blocks.mjs`
- Test: none (the converter is unit-tested in Task 2; this is the operational shell)

- [ ] **Step 1: Provide the DDL (user runs in Supabase SQL editor)** — document this exact SQL in the script header and in the task report for the controller to hand to the user:

```sql
alter table programs add column if not exists description_blocks jsonb;
alter table programs add column if not exists description_verified boolean not null default false;
```
Both additive + nullable/defaulted → reversible (`alter table programs drop column ...`). The user runs this once before the data migration.

- [ ] **Step 2: Write the migration script** — `scripts/backfill-program-blocks.mjs`: load `.env.local`; read programs with `description_blocks IS NULL AND description_verified = false` (null-only, never overwrite); for each, `htmlToBlocks(description)` (import the inline-equivalent converter — since the script is ESM outside the TS build, import from a small shared `.mjs` OR re-implement minimally; PREFER importing the built converter via a tiny node ESM shim. If that's impractical, the script imports `parse5` and mirrors `lib/program-blocks-convert.ts` byte-for-byte with a source-of-truth comment, exactly as the Phase-4 backfill mirrored its rule). Print a dry-run report: per program → `converted` / `raw-fallback` (list these under "NEEDS HUMAN ATTENTION") / counts. Write `description_blocks` only with `--apply`. `description_verified` stays false for every row (humans verify in admin). Idempotent (null-only). Never touch `description`.

- [ ] **Step 3: Verify the script parses** — `node --check scripts/backfill-program-blocks.mjs`; lint if in scope.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-program-blocks.mjs
git commit -m "chore(blocks): idempotent null-only program-blocks migration script"
```

> **Controller steps (NOT subagent):** (1) hand the user the Step-1 SQL to run in Supabase; (2) after columns exist, run `node scripts/backfill-program-blocks.mjs` (dry-run) and review the report — confirm 0 raw-fallbacks across the 23; (3) snapshot, then `--apply`; (4) the operator verifies each program side-by-side in admin and flips `verified`. Public output is unchanged until each flip.

---

## Verification Gate (after all tasks)

- `npm test` green (incl. the 23-fixture conservation property test); `tsc` clean; eslint 0 warnings on changed files; `npm run build` succeeds (or note remote-DB-only failures).
- Conservation property holds for all 23 real descriptions; 0 raw fallbacks.
- With columns absent / no program verified → public program pages render exactly as today (legacy path). After verifying one program: its public page renders blocks, visually identical to the legacy render (side-by-side parity); un-verify reverts instantly.
- Block editor: add/reorder/delete blocks, edit a bold link via segments, upload a replacement image, raw block is read-only/non-deletable.
- A malformed `description_blocks` JSON submission throws `StructuredFieldError` → `app/admin/error.tsx` (never silent wipe).

## Test Strategy (per spec §8 Phase 5)

Binding coverage: (1) the converter's **conservation property over all 23 real fixtures** (no source text node absent/altered) — also enforced as a runtime guard; (2) the specific real-data cases: bold-link→3 runs, multi-`<p>` `<li>`→multi-paragraph item, whitespace-`<strong>` preserved, astral/ZWJ unicode survives, `&amp;` round-trip, spacer paragraph, decorative image, unknown-tag fail-close; (3) `coerceDescriptionBlocks` partial/malformed/unknown-type; (4) renderer parity (bold-link→`<a><strong rel>`, `&` not double-encoded, multi-paragraph `<li>`, spacer `<p>`); (5) editor serialization round-trip. The public render gate composes the tested `hasVisibleContent`; the migration mirrors the tested converter.
