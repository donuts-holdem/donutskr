"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePublic } from "@/lib/revalidate";
import { uploadIfPresent } from "@/lib/upload";

function parseSpecialPageForm(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  function parseJson(k: string, fallback: unknown) {
    try { return JSON.parse(String(fd.get(k) || "")); } catch { return fallback; }
  }
  return {
    slug: String(fd.get("slug") || ""),
    label: s("label"),
    title: String(fd.get("title") || ""),
    description: s("description"),
    date: s("date"),
    venue: s("venue"),
    address: s("address"),
    start_time: s("start_time"),
    entry_link: s("entry_link"),
    cta_label: s("cta_label"),
    sponsor_name: s("sponsor_name"),
    gallery: parseJson("gallery", []),
    info_cards: parseJson("info_cards", []),
    note_list: parseJson("note_list", []),
    blind_structure_id: s("blind_structure_id"),
    start_show_date: s("start_show_date"),
    end_show_date: s("end_show_date"),
    is_visible: fd.get("is_visible") === "on",
  };
}

export async function createSpecialPage(fd: FormData) {
  const supabase = await createServerSupabase();
  const poster = await uploadIfPresent(supabase, fd, "poster", null);
  const sponsor_logo = await uploadIfPresent(supabase, fd, "sponsor_logo", null);
  const { error } = await supabase.from("special_pages").insert({ ...parseSpecialPageForm(fd), poster, sponsor_logo });
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/special-pages");
}

export async function updateSpecialPage(id: string, fd: FormData) {
  const supabase = await createServerSupabase();
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  const poster = await uploadIfPresent(supabase, fd, "poster", s("poster_existing"));
  const sponsor_logo = await uploadIfPresent(supabase, fd, "sponsor_logo", s("sponsor_logo_existing"));
  const { error } = await supabase.from("special_pages").update({ ...parseSpecialPageForm(fd), poster, sponsor_logo }).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/special-pages");
}

export async function deleteSpecialPage(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("special_pages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/special-pages");
}
