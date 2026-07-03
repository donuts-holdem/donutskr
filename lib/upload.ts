import type { SupabaseClient } from "@supabase/supabase-js";

/** Max size for admin image uploads. Shared by uploadIfPresent + the API route. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// Whitelisted image extensions. Persisted keys use one of these (lowercased);
// the caller-supplied filename is never used in the storage key.
const IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
  "bmp",
  "ico",
  "heic",
  "heif",
]);

function normalizeExt(ext: string): string {
  const lower = ext.toLowerCase();
  return lower === "jpeg" ? "jpg" : lower;
}

/** Pick a safe extension from a whitelist, preferring the filename then the MIME. */
export function pickImageExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTS.has(fromName)) return normalizeExt(fromName);
  const fromMime = file.type.split("/")[1]?.toLowerCase().replace("+xml", "") ?? "";
  if (IMAGE_EXTS.has(fromMime)) return normalizeExt(fromMime);
  return "bin";
}

/** Validate an admin image upload; throws with a user-facing message on failure. */
export function assertImageUpload(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("이미지 크기는 10MB를 넘을 수 없습니다.");
  }
}

/** Build a randomized, extension-preserving storage key (never trusts file.name). */
export function buildUploadKey(folder: string, file: File): string {
  return `${folder}/${Date.now()}-${crypto.randomUUID()}.${pickImageExtension(file)}`;
}

export async function uploadIfPresent(
  supabase: SupabaseClient,
  fd: FormData,
  field: string,
  existing: string | null
): Promise<string | null> {
  const file = fd.get(`${field}_file`) as File | null;
  if (!file || file.size === 0) return existing;
  assertImageUpload(file);
  const path = buildUploadKey(field, file);
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
