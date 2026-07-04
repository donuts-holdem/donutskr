import { createServerSupabase } from "@/lib/supabase/server";
import { getPublicSpecialPageSlugs } from "@/lib/data/specialPages";
import type { HeaderTab, NavTab, TabType } from "@/lib/types";

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

/**
 * Pure href resolution for a nav tab (see selectHeaderTabs). No I/O so it is unit-tested.
 *   internal → the internal route (`slug`, leading slash ensured)
 *   external → `external_url`
 *   special  → `/${slug}` (the [tabSlug] special-page route)
 * Returns null when the tab has no usable destination (so the caller drops it).
 */
export function resolveTabHref(tab: Pick<NavTab, "type" | "slug" | "external_url">): string | null {
  switch (tab.type) {
    case "external":
      return tab.external_url && tab.external_url.trim() !== "" ? tab.external_url : null;
    case "special": {
      const slug = (tab.slug ?? "").replace(/^\/+/, "");
      return slug ? `/${slug}` : null;
    }
    case "internal":
    default: {
      const slug = tab.slug ?? "";
      if (slug.trim() === "") return null;
      return slug.startsWith("/") ? slug : `/${slug}`;
    }
  }
}

/**
 * Pure selection of header entries from already header-filtered tabs.
 * `special` tabs are cross-checked against the set of currently-public special-page
 * slugs so a deleted/unpublished backing page never yields a 404 nav link.
 */
export function selectHeaderTabs(tabs: NavTab[], publicSpecialSlugs: Set<string>): HeaderTab[] {
  const out: HeaderTab[] = [];
  for (const tab of tabs) {
    if (tab.type === "special") {
      const slug = (tab.slug ?? "").replace(/^\/+/, "");
      if (!publicSpecialSlugs.has(slug)) continue;
    }
    const href = resolveTabHref(tab);
    if (href === null) continue;
    out.push({ label: tab.name, href, external: tab.type === "external", mobileHidden: !tab.mobile_visible });
  }
  return out;
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

/**
 * Public-header nav entries: visible (date-windowed) tabs ordered by sort_order,
 * with `special` tabs cross-checked against currently-public special pages.
 * Returns resolved {label, href, external, mobileHidden} entries.
 */
export async function getHeaderTabs(today: string): Promise<HeaderTab[]> {
  const tabs = (await getAllTabs()).filter((t) => isTabActive(t, today));
  const publicSpecialSlugs = tabs.some((t) => t.type === "special")
    ? await getPublicSpecialPageSlugs(today)
    : new Set<string>();
  return selectHeaderTabs(tabs, publicSpecialSlugs);
}
