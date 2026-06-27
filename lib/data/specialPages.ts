import { createServerSupabase } from "@/lib/supabase/server";
import type { SpecialPage } from "@/lib/types";
import { normalizeSlug } from "@/lib/slug";

export function mapSpecialPage(r: any): SpecialPage {
  return {
    id: String(r.id ?? ""),
    slug: String(r.slug ?? ""),
    label: r.label ?? null,
    title: String(r.title ?? ""),
    description: r.description ?? null,
    date: r.date ?? null,
    venue: r.venue ?? null,
    address: r.address ?? null,
    start_time: r.start_time ?? null,
    entry_link: r.entry_link ?? null,
    cta_label: r.cta_label ?? null,
    sponsor_name: r.sponsor_name ?? null,
    sponsor_logo: r.sponsor_logo ?? null,
    poster: r.poster ?? null,
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
    info_cards: Array.isArray(r.info_cards) ? r.info_cards : [],
    note_list: Array.isArray(r.note_list) ? r.note_list : [],
    blind_structure_id: r.blind_structure_id ?? null,
    start_show_date: r.start_show_date ?? null,
    end_show_date: r.end_show_date ?? null,
    is_visible: r.is_visible ?? true,
  };
}

export async function getSpecialPageBySlug(slug: string): Promise<SpecialPage | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("special_pages")
    .select("*")
    .eq("slug", normalizeSlug(slug))
    .is("deleted_at", null)
    .eq("is_visible", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSpecialPage(data) : null;
}

export async function getAllSpecialPages(): Promise<SpecialPage[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("special_pages")
    .select("*")
    .is("deleted_at", null)
    .order("slug");
  if (error) throw error;
  return (data ?? []).map(mapSpecialPage);
}
