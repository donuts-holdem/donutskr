import { createServerSupabase } from "@/lib/supabase/server";
import type { Event, EventCategory } from "@/lib/types";
import { isEventPublic } from "@/lib/visibility";
import { filterByActiveSeason } from "@/lib/season-rules";
import { getActiveSeason } from "@/lib/data/seasons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapEvent(r: any): Event {
  return {
    id: String(r.id ?? ""), season_id: r.season_id ?? null,
    title: String(r.title ?? ""), event_type: r.event_type ?? null, date: r.date ?? null,
    weekday: r.weekday ?? null, location: r.location ?? null, address: r.address ?? null,
    start_time: r.start_time ?? null, reg_close_time: r.reg_close_time ?? null,
    buy_in: r.buy_in ?? null, entry_link: r.entry_link ?? null, button_label: r.button_label ?? null,
    description: r.description ?? null, poster_image: r.poster_image ?? null,
    category: (r.category ?? "upcoming") as EventCategory, status: (r.status ?? "scheduled"),
    is_visible: r.is_visible ?? true,
    blind_structure_id: r.blind_structure_id ?? null,
    timer_event_id: r.timer_event_id ?? null, timer_event_url: r.timer_event_url ?? null,
  };
}

export async function getEvents(opts?: { category?: EventCategory }): Promise<Event[]> {
  const supabase = await createServerSupabase();
  let q = supabase.from("events").select("*").is("deleted_at", null).eq("is_visible", true);
  if (opts?.category) q = q.eq("category", opts.category);
  const [{ data, error }, active] = await Promise.all([
    q.order("date", { ascending: true }).order("start_time", { ascending: true }).order("id", { ascending: true }),
    getActiveSeason(),
  ]);
  if (error) throw error;
  const events = (data ?? []).map(mapEvent).filter(isEventPublic);
  return filterByActiveSeason(events, active?.id ?? null);
}

// Admin-only: includes hidden (is_visible=false) events so they remain editable.
export async function getAllEvents(): Promise<Event[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("events").select("*").is("deleted_at", null)
    .order("date", { ascending: true }).order("start_time", { ascending: true }).order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data ? mapEvent(data) : null;
}
