"use server";
import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePublic } from "@/lib/revalidate";

export async function updateOnlineLeague(fd: FormData) {
  const supabase = await createServerSupabase();
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  function parseJson(k: string, fallback: any) {
    try { return JSON.parse(String(fd.get(k) || "")); } catch { return fallback; }
  }
  const payload = {
    status: String(fd.get("status") || "hidden"),
    tab_visible: fd.get("tab_visible") === "on",
    title: s("title"),
    description: s("description"),
    join_guide: s("join_guide"),
    steps: parseJson("steps", []),
    links: parseJson("links", {}),
    today_leagues: parseJson("today_leagues", []),
    notice_text: s("notice_text"),
    cta_label: s("cta_label"),
    cta_url: s("cta_url"),
    sheet_url: s("sheet_url"),
  };
  const { error } = await supabase.from("online_league").update(payload).eq("id", 1);
  if (error) throw error;
  revalidatePublic(["/online-league"]);
}
