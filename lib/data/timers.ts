import { createServerSupabase } from "@/lib/supabase/server";
import type { TimerSession, TimerLevel, TimerPrize } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTimer(r: any): TimerSession {
  return {
    id: String(r.id ?? ""),
    event_id: r.event_id ?? null,
    title: String(r.title ?? ""),
    buy_in: r.buy_in ?? null,
    starting_stack: r.starting_stack ?? null,
    structure: (Array.isArray(r.structure) ? r.structure : []) as TimerLevel[],
    status: (r.status ?? "paused") as TimerSession["status"],
    started_at: r.started_at ?? null,
    elapsed_offset_sec: Number(r.elapsed_offset_sec ?? 0),
    level_index: Number(r.level_index ?? 0),
    entries: Number(r.entries ?? 0),
    players: Number(r.players ?? 0),
    reg_close_level: r.reg_close_level ?? null,
    prizes: (Array.isArray(r.prizes) ? r.prizes : []) as TimerPrize[],
    finished_at: r.finished_at ?? null,
    version: Number(r.version ?? 0),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export interface TimerListItem extends TimerSession {
  event_title: string | null;
}

// Admin list: non-deleted, newest first, with the linked event's title.
export async function getTimers(): Promise<TimerListItem[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("timer_sessions")
    .select("*, events(title)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ ...mapTimer(r), event_title: r.events?.title ?? null }));
}

// Public: a single non-deleted session (the display page), or null.
export async function getTimerById(id: string): Promise<TimerSession | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("timer_sessions").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data ? mapTimer(data) : null;
}
