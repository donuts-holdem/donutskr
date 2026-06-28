import { createServerSupabase } from "@/lib/supabase/server";
import type { Season } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSeason(r: any): Season {
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    year: Number(r.year ?? 0),
    start_date: r.start_date ?? null,
    end_date: r.end_date ?? null,
    is_active: Boolean(r.is_active),
    hero_text: r.hero_text ?? null,
    sub_text: r.sub_text ?? null,
    badge_text: r.badge_text ?? null,
    hero_image: r.hero_image ?? null,
    bg_image: r.bg_image ?? null,
  };
}

export async function getActiveSeason(): Promise<Season | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSeason(data) : null;
}

export async function getAllSeasons(): Promise<Season[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .is("deleted_at", null)
    .order("year", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSeason);
}

export async function getSeasonById(id: string): Promise<Season | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSeason(data) : null;
}
