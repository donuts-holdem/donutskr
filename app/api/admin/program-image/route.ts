import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const supabase = await requireAdmin();

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  // Optional destination folder (allowlisted). Defaults to program_body so the
  // existing rich-editor caller is unaffected.
  const ALLOWED_FOLDERS = new Set(["program_body", "site_media"]);
  const folderRaw = fd.get("folder");
  const folder = typeof folderRaw === "string" && ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "program_body";

  const path = `${folder}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ url });
}
