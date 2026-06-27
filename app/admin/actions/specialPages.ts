"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { uploadIfPresent } from "@/lib/upload";
import { parseJsonField, coerceStringList, coerceLabelValueList } from "@/lib/admin/structured-fields";

function parseSpecialPageForm(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  const fk = (k: string) => { const v = s(k); return v === "none" ? null : v; };
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
    gallery: coerceStringList(parseJsonField(fd.get("gallery"), "갤러리")),
    info_cards: coerceLabelValueList(parseJsonField(fd.get("info_cards"), "정보 카드")),
    note_list: coerceStringList(parseJsonField(fd.get("note_list"), "노트 목록")),
    blind_structure_id: fk("blind_structure_id"),
    start_show_date: s("start_show_date"),
    end_show_date: s("end_show_date"),
    is_visible: fd.get("is_visible") === "on",
  };
}

export async function createSpecialPage(fd: FormData) {
  const supabase = await requireAdmin();
  const poster = await uploadIfPresent(supabase, fd, "poster", null);
  const sponsor_logo = await uploadIfPresent(supabase, fd, "sponsor_logo", null);
  const { error } = await supabase.from("special_pages").insert({ ...parseSpecialPageForm(fd), poster, sponsor_logo });
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/special-pages?saved=1");
}

export async function updateSpecialPage(id: string, fd: FormData) {
  const supabase = await requireAdmin();
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  const poster = await uploadIfPresent(supabase, fd, "poster", s("poster_existing"));
  const sponsor_logo = await uploadIfPresent(supabase, fd, "sponsor_logo", s("sponsor_logo_existing"));
  const { error } = await supabase.from("special_pages").update({ ...parseSpecialPageForm(fd), poster, sponsor_logo }).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/special-pages?saved=1");
}

export async function deleteSpecialPage(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("special_pages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/special-pages?deleted=1");
}
