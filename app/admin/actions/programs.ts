"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { uploadIfPresent } from "@/lib/upload";
import { parseJsonField, coerceDescriptionBlocks } from "@/lib/admin/structured-fields";
import type { Block } from "@/lib/program-blocks";
import { sanitizeRawBlocks } from "@/lib/admin/sanitize-blocks";
import { assertRowsAffected } from "@/lib/admin/assert-rows";

function parse(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    slug: String(fd.get("slug")), title: String(fd.get("title")), category: s("category"),
    program_group: String(fd.get("program_group") || "poker"), status: s("status"),
    member_count: Number(fd.get("member_count") || 0), location: s("location"),
    start_date: s("start_date"), end_date: s("end_date"), description: s("description"),
    manager_name: s("manager_name"), manager_role: s("manager_role"),
    cta_label: s("cta_label"), entry_link: s("entry_link"),
    // is_hot / is_affiliate are no longer editable from the form (badges removed).
    // Their columns are intentionally left untouched here so existing data is
    // preserved across saves.
    is_visible: fd.get("is_visible") === "on",
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
  const values: ReturnType<typeof parse> & { cover_image: string | null; manager_avatar: string | null } = { ...parse(fd), cover_image: null, manager_avatar: null };
  values.cover_image = await uploadIfPresent(supabase, fd, "cover_image", null);
  values.manager_avatar = await uploadIfPresent(supabase, fd, "manager_avatar", null);
  const blocks = sanitizeRawBlocks(
    await reconcileBlockImages(
      supabase,
      fd,
      coerceDescriptionBlocks(parseJsonField(fd.get("description_blocks"), "description_blocks")),
    ),
  );
  // New programs land at the end of the list. Ordering is DnD-managed, so seed
  // sort_order from the current max (+10) rather than a form field.
  const { data: last } = await supabase
    .from("programs")
    .select("sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (Number(last?.sort_order ?? 0) || 0) + 10;
  const { error } = await supabase.from("programs").insert({ ...values, sort_order, description_blocks: blocks, description_verified: true });
  if (error) throw error;
  revalidatePublic(["/programs"]);
  redirect("/admin/programs?saved=1");
}

export async function updateProgram(id: string, fd: FormData) {
  const supabase = await requireAdmin();
  const values: ReturnType<typeof parse> & { cover_image: string | null; manager_avatar: string | null } = { ...parse(fd), cover_image: null, manager_avatar: null };
  values.cover_image = await uploadIfPresent(supabase, fd, "cover_image", (fd.get("cover_image_existing") as string) || null);
  values.manager_avatar = await uploadIfPresent(supabase, fd, "manager_avatar", (fd.get("manager_avatar_existing") as string) || null);
  const blocks = sanitizeRawBlocks(
    await reconcileBlockImages(
      supabase,
      fd,
      coerceDescriptionBlocks(parseJsonField(fd.get("description_blocks"), "description_blocks")),
    ),
  );
  const { data, error } = await supabase.from("programs").update({ ...values, description_blocks: blocks, description_verified: true }).eq("id", id).select("id");
  if (error) throw error;
  assertRowsAffected(data);
  revalidatePublic([`/programs/${values.slug}`]);
  redirect("/admin/programs?saved=1");
}

export async function deleteProgram(id: string) {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("programs").update({ deleted_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) throw error;
  assertRowsAffected(data);
  revalidatePublic(["/programs"]);
  redirect("/admin/programs?deleted=1");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function reorderPrograms(fd: FormData) {
  const supabase = await requireAdmin();
  // Untrusted input: only accept well-formed uuids, dedupe, and cross-check
  // against existing rows so stale/forged ids can't touch other records.
  let parsed: unknown = [];
  try { parsed = JSON.parse(String(fd.get("ordered_ids") || "[]")); } catch { parsed = []; }
  const seen = new Set<string>();
  const ids = (Array.isArray(parsed) ? parsed : [])
    .filter((v): v is string => typeof v === "string" && UUID_RE.test(v))
    .filter((v) => (seen.has(v) ? false : (seen.add(v), true)));

  const { data: existing, error: fetchError } = await supabase
    .from("programs")
    .select("id")
    .is("deleted_at", null);
  if (fetchError) throw fetchError;
  const validIds = new Set((existing ?? []).map((r) => String(r.id)));

  let order = 0;
  for (const id of ids) {
    if (!validIds.has(id)) continue; // ignore ids that don't exist
    // No assertRowsAffected here (intentional): this is a best-effort bulk
    // reorder. A row can legitimately match 0 rows if it was concurrently deleted
    // after the validIds snapshot above, and throwing mid-loop would leave a
    // partial reorder. sort_order carries no user data, and a genuine RLS
    // permission problem still surfaces loudly on the next single-row save.
    const { error } = await supabase.from("programs").update({ sort_order: order * 10 }).eq("id", id);
    if (error) throw error;
    order++;
  }

  revalidatePublic(["/programs"]);
  redirect("/admin/programs?saved=1");
}
