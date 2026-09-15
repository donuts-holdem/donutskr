import { requireAdmin } from "@/lib/auth";
import { assertImageUpload, buildUploadKey, type ImageUploadMetadata } from "@/lib/upload";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  let supabase;
  try { supabase = await requireAdmin(); } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "Unauthorized";
    return Response.json({ error: unauthenticated ? "다시 로그인해 주세요." : "이미지를 업로드할 권한이 없습니다." }, { status: unauthenticated ? 401 : 403 });
  }
  let file: ImageUploadMetadata;
  try {
    const metadata = await request.json();
    if (!metadata || typeof metadata.name !== "string" || !metadata.name.trim()
      || typeof metadata.type !== "string" || typeof metadata.size !== "number") {
      throw new Error("이미지 파일을 확인해 주세요.");
    }
    file = { name: metadata.name, type: metadata.type, size: metadata.size };
    assertImageUpload(file);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "이미지 파일을 확인해 주세요." }, { status: 400 });
  }
  const path = buildUploadKey("site_media", file);
  const bucket = supabase.storage.from("media");
  const { data, error } = await bucket.createSignedUploadUrl(path, { upsert: false });
  if (error || !data) return Response.json({ error: "이미지를 업로드하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
  return Response.json({ bucket: "media", path: data.path, token: data.token, url: bucket.getPublicUrl(path).data.publicUrl }, { headers: { "Cache-Control": "no-store" } });
}
