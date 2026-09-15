"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";
import { assertImageUpload } from "@/lib/upload";

const uploadError = "이미지를 업로드하지 못했습니다. 다시 시도해 주세요.";

/** Authorize metadata in the app, then send file bytes directly to Storage. */
export async function uploadAdminImage(file: File): Promise<string> {
  assertImageUpload(file);
  const response = await fetch("/api/admin/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
  });
  const result = await response.json().catch(() => null) as {
    bucket?: string; path?: string; token?: string; url?: string; error?: string;
  } | null;
  if (!response.ok) throw new Error(result?.error ?? uploadError);
  if (result?.bucket !== "media" || typeof result.path !== "string" || !result.path.startsWith("site_media/")
    || typeof result.token !== "string" || !result.token || typeof result.url !== "string"
    || !result.url.startsWith("https://")) {
    throw new Error("이미지 주소를 확인하지 못했습니다. 다시 업로드해 주세요.");
  }
  const { error } = await createBrowserSupabase().storage.from(result.bucket)
    .uploadToSignedUrl(result.path, result.token, file, { contentType: file.type });
  if (error) throw new Error(uploadError);
  return result.url;
}
