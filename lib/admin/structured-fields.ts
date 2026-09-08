// Serialization shared by the retained public-page settings and sponsor editor.
export class StructuredFieldError extends Error {}

export function parseJsonField(raw: FormDataEntryValue | null, field: string): unknown {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    throw new StructuredFieldError(`"${field}" 입력을 저장할 수 없습니다 (형식 오류).`);
  }
}

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

export function coerceSponsors(value: unknown): { name: string; logo?: string; url?: string }[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const source = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const row: { name: string; logo?: string; url?: string } = { name: str(source.name) };
    if (str(source.logo) !== "") row.logo = str(source.logo);
    if (str(source.url) !== "") row.url = str(source.url);
    return row;
  }).filter((row) => row.name.trim() !== "");
}
