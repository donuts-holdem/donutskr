/**
 * Normalize a route slug before matching it against a stored (NFC) slug.
 *
 * In this Next.js setup, dynamic `[slug]` segments arrive percent-encoded, so a
 * raw `.eq("slug", param)` never matches non-ASCII (Korean) slugs. Decoding and
 * NFC-normalizing makes encoded and/or NFD-normalized params match the DB.
 */
export function normalizeSlug(slug: string): string {
  let s = slug;
  try {
    s = decodeURIComponent(slug);
  } catch {
    // keep raw on malformed percent-encoding
  }
  return s.normalize("NFC");
}
