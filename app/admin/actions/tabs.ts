"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";

function parseTabForm(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    name: String(fd.get("name") || ""),
    key: String(fd.get("key") || ""),
    type: String(fd.get("type") || "internal"),
    slug: s("slug"),
    external_url: s("external_url"),
    is_visible: fd.get("is_visible") === "on",
    mobile_visible: fd.get("mobile_visible") === "on",
    sort_order: Number(fd.get("sort_order") || 0),
    start_show_date: s("start_show_date"),
    end_show_date: s("end_show_date"),
    home_card_visible: fd.get("home_card_visible") === "on",
    home_card_title: s("home_card_title"),
    home_card_desc: s("home_card_desc"),
    home_card_cta: s("home_card_cta"),
  };
}

export async function createTab(fd: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("navigation_tabs").insert(parseTabForm(fd));
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/tabs");
}

export async function updateTab(id: string, fd: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("navigation_tabs").update(parseTabForm(fd)).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/tabs");
}

export async function deleteTab(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("navigation_tabs").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/tabs");
}
