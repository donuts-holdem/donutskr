"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePublic } from "@/lib/revalidate";

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
    hero_image: s("hero_image"),
    bg_image: s("bg_image"),
    theme_color: s("theme_color"),
    footer_sponsor_visible: fd.get("footer_sponsor_visible") === "on",
  };
}

export async function createSeason(fd: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("seasons").insert(parse(fd));
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/seasons");
}

export async function updateSeason(id: string, fd: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("seasons").update(parse(fd)).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/seasons");
}

export async function deleteSeason(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("seasons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/seasons");
}

export async function activateSeason(id: string) {
  const supabase = await createServerSupabase();
  // Deactivate all other seasons
  const { error: err1 } = await supabase
    .from("seasons")
    .update({ is_active: false })
    .neq("id", id);
  if (err1) throw err1;
  // Activate the target season
  const { error: err2 } = await supabase
    .from("seasons")
    .update({ is_active: true })
    .eq("id", id);
  if (err2) throw err2;
  revalidatePublic();
  redirect("/admin/seasons");
}
