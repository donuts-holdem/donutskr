"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { uploadIfPresent } from "@/lib/upload";
import { parseJsonField, coerceDescriptionBlocks } from "@/lib/admin/structured-fields";
import type { Block } from "@/lib/program-blocks";
import { sanitizeRawBlocks } from "@/lib/admin/sanitize-blocks";

function parse(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    slug: String(fd.get("slug")), title: String(fd.get("title")), category: s("category"),
    program_group: String(fd.get("program_group") || "poker"), status: s("status"),
    member_count: Number(fd.get("member_count") || 0), location: s("location"),
    start_date: s("start_date"), end_date: s("end_date"), description: s("description"),
    manager_name: s("manager_name"), manager_role: s("manager_role"), manager_avatar: s("manager_avatar"),
    cta_label: s("cta_label"), entry_link: s("entry_link"), external_url: s("external_url"),
    is_hot: fd.get("is_hot") === "on", is_affiliate: fd.get("is_affiliate") === "on",
    is_visible: fd.get("is_visible") === "on", sort_order: Number(fd.get("sort_order") || 0),
  };
}

async function reconcileBlockImages(supabase: Awaited<ReturnType<typeof requireAdmin>>, fd: FormData, blocks: Block[]): Promise<Block[]> {
  let imgIdx = 0;
  for (const block of blocks) {
    if (block.type === "image") {
      block.src = (await uploadIfPresent(supabase, fd, `block_image_${imgIdx}`, block.src)) ?? block.src;
      imgIdx++;
    }
  }
  return blocks;
}

export async function createProgram(fd: FormData) {
  const supabase = await requireAdmin();
  const values: ReturnType<typeof parse> & { cover_image: string | null } = { ...parse(fd), cover_image: null };
  values.cover_image = await uploadIfPresent(supabase, fd, "cover_image", null);
  const blocks = sanitizeRawBlocks(
    await reconcileBlockImages(
      supabase,
      fd,
      coerceDescriptionBlocks(parseJsonField(fd.get("description_blocks"), "description_blocks")),
    ),
  );
  const { error } = await supabase.from("programs").insert({ ...values, description_blocks: blocks, description_verified: true });
  if (error) throw error;
  revalidatePublic(["/programs"]);
  redirect("/admin/programs?saved=1");
}

export async function updateProgram(id: string, fd: FormData) {
  const supabase = await requireAdmin();
  const values: ReturnType<typeof parse> & { cover_image: string | null } = { ...parse(fd), cover_image: null };
  values.cover_image = await uploadIfPresent(supabase, fd, "cover_image", (fd.get("cover_image_existing") as string) || null);
  const blocks = sanitizeRawBlocks(
    await reconcileBlockImages(
      supabase,
      fd,
      coerceDescriptionBlocks(parseJsonField(fd.get("description_blocks"), "description_blocks")),
    ),
  );
  const { error } = await supabase.from("programs").update({ ...values, description_blocks: blocks, description_verified: true }).eq("id", id);
  if (error) throw error;
  revalidatePublic([`/programs/${values.slug}`]);
  redirect("/admin/programs?saved=1");
}

export async function deleteProgram(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("programs").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePublic(["/programs"]);
  redirect("/admin/programs?deleted=1");
}

export async function setProgramVerified(id: string, verified: boolean) {
  const supabase = await requireAdmin();
  const { data } = await supabase.from("programs").select("slug").eq("id", id).single();
  const { error } = await supabase.from("programs").update({ description_verified: verified }).eq("id", id);
  if (error) throw error;
  revalidatePublic(data?.slug ? [`/programs/${data.slug}`] : []);
  redirect(`/admin/programs/${id}/edit?saved=1`);
}
