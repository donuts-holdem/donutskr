// Pure (de)serialization for admin repeatable-field editors. Editors emit a
// JSON string in a hidden input; parseJsonField parses it STRICTLY (malformed
// JSON throws → caught by app/admin/error.tsx) so a typo can never silently
// wipe a jsonb field, and the coerce* helpers normalize the parsed value into
// the exact stored shape, tolerating partial/legacy element shapes.

import type { Block, Run, Paragraph } from "@/lib/program-blocks";

export class StructuredFieldError extends Error {}

export function parseJsonField(raw: FormDataEntryValue | null, field: string): unknown {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s === "") return null;
  try {
    return JSON.parse(s);
  } catch {
    throw new StructuredFieldError(`"${field}" 입력을 저장할 수 없습니다 (형식 오류).`);
  }
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}
function asObject(el: unknown): Record<string, unknown> {
  return el && typeof el === "object" ? (el as Record<string, unknown>) : {};
}

export function coerceStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(str).filter((v) => v.trim() !== "");
}

export function coerceLabelValueList(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((el) => {
      const o = asObject(el);
      return { label: str(o.label), value: str(o.value) };
    })
    .filter((c) => c.label.trim() !== "" || c.value.trim() !== "");
}

export function coerceStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.trim() === "") continue;
    out[k] = str(v);
  }
  return out;
}

export function coerceTodayLeagues(
  value: unknown,
): { name: string; time?: string; reg_close?: string; link?: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((el) => {
      const o = asObject(el);
      const row: { name: string; time?: string; reg_close?: string; link?: string } = { name: str(o.name) };
      if (str(o.time) !== "") row.time = str(o.time);
      if (str(o.reg_close) !== "") row.reg_close = str(o.reg_close);
      if (str(o.link) !== "") row.link = str(o.link);
      return row;
    })
    .filter((r) => r.name.trim() !== "");
}

export function coerceSponsors(value: unknown): { name: string; logo?: string; url?: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((el) => {
      const o = asObject(el);
      const row: { name: string; logo?: string; url?: string } = { name: str(o.name) };
      if (str(o.logo) !== "") row.logo = str(o.logo);
      if (str(o.url) !== "") row.url = str(o.url);
      return row;
    })
    .filter((r) => r.name.trim() !== "");
}

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
