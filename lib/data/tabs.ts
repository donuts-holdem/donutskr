import { createServerSupabase } from "@/lib/supabase/server";
import type { NavTab, TabType } from "@/lib/types";

export function mapTab(r: any): NavTab {
  return {
    id: String(r.id ?? ""), name: String(r.name ?? ""), key: String(r.key ?? ""),
    type: (r.type ?? "internal") as TabType, slug: r.slug ?? null, external_url: r.external_url ?? null,
    is_visible: r.is_visible ?? true, sort_order: Number(r.sort_order ?? 0), mobile_visible: r.mobile_visible ?? true,
    start_show_date: r.start_show_date ?? null, end_show_date: r.end_show_date ?? null,
    home_card_visible: Boolean(r.home_card_visible), home_card_title: r.home_card_title ?? null,
    home_card_desc: r.home_card_desc ?? null, home_card_cta: r.home_card_cta ?? null,
  };
}

export function isTabActive(tab: NavTab, today: string): boolean {
  if (!tab.is_visible) return false;
  if (tab.start_show_date && today < tab.start_show_date) return false;
  if (tab.end_show_date && today > tab.end_show_date) return false;
  return true;
}

export async function getAllTabs(): Promise<NavTab[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("navigation_tabs").select("*").is("deleted_at", null).order("sort_order");
  if (error) throw error;
  return (data ?? []).map(mapTab);
}

export async function getVisibleTabs(today: string): Promise<NavTab[]> {
  return (await getAllTabs()).filter((t) => isTabActive(t, today));
}
