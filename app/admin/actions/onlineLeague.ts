"use server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { parseJsonField, coerceStringList, coerceStringRecord, coerceTodayLeagues } from "@/lib/admin/structured-fields";

export async function updateOnlineLeague(fd: FormData) {
  const supabase = await requireAdmin();
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  const payload = {
    status: String(fd.get("status") || "hidden"),
    tab_visible: fd.get("tab_visible") === "on",
    title: s("title"),
    description: s("description"),
    join_guide: s("join_guide"),
    steps: coerceStringList(parseJsonField(fd.get("steps"), "스텝")),
    links: coerceStringRecord(parseJsonField(fd.get("links"), "링크")),
    today_leagues: coerceTodayLeagues(parseJsonField(fd.get("today_leagues"), "오늘의 리그")),
    notice_text: s("notice_text"),
    cta_label: s("cta_label"),
    cta_url: s("cta_url"),
    sheet_url: s("sheet_url"),
  };
  const { error } = await supabase.from("online_league_settings").update(payload).eq("id", 1);
  if (error) throw error;
  revalidatePublic(["/online-league"]);
}
