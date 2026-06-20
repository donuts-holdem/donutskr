"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePublic } from "@/lib/revalidate";

function parse(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    season_id: s("season_id"), round: s("round"), title: String(fd.get("title")),
    event_type: s("event_type"), date: s("date"), weekday: s("weekday"),
    location: s("location"), address: s("address"),
    start_time: s("start_time"), reg_close_time: s("reg_close_time"), end_time: s("end_time"),
    buy_in: s("buy_in"), entry_link: s("entry_link"), button_label: s("button_label"),
    description: s("description"), category: String(fd.get("category") || "upcoming"),
    status: String(fd.get("status") || "scheduled"), is_visible: fd.get("is_visible") === "on",
    sort_order: Number(fd.get("sort_order") || 0), blind_structure_id: s("blind_structure_id"),
    timer_event_id: s("timer_event_id"), timer_event_url: s("timer_event_url"),
  };
}
export async function createEvent(fd: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").insert(parse(fd));
  if (error) throw error;
  revalidatePublic(); redirect("/admin/events");
}
export async function updateEvent(id: string, fd: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").update(parse(fd)).eq("id", id);
  if (error) throw error;
  revalidatePublic([`/schedule/${id}`]); redirect("/admin/events");
}
export async function deleteEvent(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePublic([`/schedule/${id}`]); redirect("/admin/events");
}
