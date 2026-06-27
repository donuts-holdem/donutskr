"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { uploadIfPresent } from "@/lib/upload";

function parse(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    name: String(fd.get("name")),
    code: String(fd.get("code") || "spring"),
    year: Number(fd.get("year") || new Date().getFullYear()),
    start_date: s("start_date"),
    end_date: s("end_date"),
    hero_text: s("hero_text"),
    sub_text: s("sub_text"),
    badge_text: s("badge_text"),
    theme_color: s("theme_color"),
    footer_sponsor_visible: fd.get("footer_sponsor_visible") === "on",
  };
}

export async function createSeason(fd: FormData) {
  const supabase = await requireAdmin();
  const hero_image = await uploadIfPresent(supabase, fd, "hero_image", null);
  const bg_image = await uploadIfPresent(supabase, fd, "bg_image", null);
  const { error } = await supabase.from("seasons").insert({ ...parse(fd), hero_image, bg_image });
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/seasons?saved=1");
}

export async function updateSeason(id: string, fd: FormData) {
  const supabase = await requireAdmin();
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  const hero_image = await uploadIfPresent(supabase, fd, "hero_image", s("hero_image_existing"));
  const bg_image = await uploadIfPresent(supabase, fd, "bg_image", s("bg_image_existing"));
  const { error } = await supabase.from("seasons").update({ ...parse(fd), hero_image, bg_image }).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/seasons?saved=1");
}

export async function deleteSeason(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("seasons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/seasons?deleted=1");
}

export async function activateSeason(id: string) {
  const supabase = await requireAdmin();
  // Atomic: single statement sets the target active and all others inactive,
  // ignoring soft-deleted rows. Raises if the target is missing/deleted.
  // (see supabase/migrations/0005_activate_season.sql)
  const { error } = await supabase.rpc("activate_season", { target: id });
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/seasons?saved=1");
}
