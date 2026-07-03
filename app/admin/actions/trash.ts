"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { TRASH_ENTITIES, isTrashEntity, type TrashEntity } from "@/lib/data/trash";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates the untrusted form target: `entity` must be a known trash table and
 * `id` a well-formed uuid, so a crafted submission cannot address an arbitrary
 * table or row.
 */
function parseTarget(fd: FormData): { entity: TrashEntity; id: string } {
  const entity = fd.get("entity");
  const id = fd.get("id");
  if (!isTrashEntity(entity)) throw new Error("Invalid trash entity");
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new Error("Invalid trash id");
  return { entity, id };
}

export async function restoreItem(fd: FormData) {
  const { entity, id } = parseTarget(fd);
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from(TRASH_ENTITIES[entity].table)
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/trash?saved=1");
}

export async function purgeItem(fd: FormData) {
  const { entity, id } = parseTarget(fd);
  const supabase = await requireAdmin();
  // Only hard-delete rows already in the trash. For blind_structures the child
  // blind_structure_rows are removed automatically (FK is ON DELETE CASCADE,
  // see supabase/migrations/0001_schema.sql).
  const { error } = await supabase
    .from(TRASH_ENTITIES[entity].table)
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/trash?saved=1");
}
