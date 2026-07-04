"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { assertRowsAffected } from "@/lib/admin/assert-rows";

function parseTabForm(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    name: String(fd.get("name") || ""),
    type: String(fd.get("type") || "internal"),
    slug: s("slug"),
    external_url: s("external_url"),
    is_visible: fd.get("is_visible") === "on",
    mobile_visible: fd.get("mobile_visible") === "on",
  };
}

export async function createTab(fd: FormData) {
  const supabase = await requireAdmin();
  // New tabs land at the end of the menu; order is then managed by drag on the list.
  const { data: last, error: lastError } = await supabase
    .from("navigation_tabs")
    .select("sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (lastError) throw lastError;
  const sort_order = (last?.[0]?.sort_order ?? 0) + 10;
  const { error } = await supabase.from("navigation_tabs").insert({ ...parseTabForm(fd), sort_order });
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/tabs?saved=1");
}

export async function updateTab(id: string, fd: FormData) {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("navigation_tabs").update(parseTabForm(fd)).eq("id", id).select("id");
  if (error) throw error;
  assertRowsAffected(data);
  revalidatePublic();
  redirect("/admin/tabs?saved=1");
}

export async function deleteTab(id: string) {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("navigation_tabs").update({ deleted_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) throw error;
  assertRowsAffected(data);
  revalidatePublic();
  redirect("/admin/tabs?deleted=1");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function reorderTabs(fd: FormData) {
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
    .from("navigation_tabs")
    .select("id")
    .is("deleted_at", null);
  if (fetchError) throw fetchError;
  const validIds = new Set((existing ?? []).map((r) => String(r.id)));

  let order = 0;
  for (const id of ids) {
    if (!validIds.has(id)) continue; // ignore ids that don't exist
    // No assertRowsAffected here (intentional): best-effort bulk reorder — a row
    // can legitimately match 0 rows if concurrently deleted after the snapshot,
    // and throwing mid-loop would leave a partial reorder. A genuine RLS problem
    // still surfaces loudly on the next single-row save.
    const { error } = await supabase.from("navigation_tabs").update({ sort_order: order * 10 }).eq("id", id);
    if (error) throw error;
    order++;
  }

  revalidatePublic();
  redirect("/admin/tabs?saved=1");
}
