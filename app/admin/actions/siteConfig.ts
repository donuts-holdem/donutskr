"use server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { validateHttpsUrlFormat } from "@/lib/safe-url";

export async function updateSiteConfig(fd: FormData) {
  const supabase = await requireAdmin();
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  function parseJson(k: string, fallback: any) {
    try { return JSON.parse(String(fd.get(k) || "")); } catch { return fallback; }
  }
  const leaderboard_api_url = s("leaderboard_api_url");
  // Reject SSRF-prone targets at save time (host resolution happens at fetch time).
  if (leaderboard_api_url) validateHttpsUrlFormat(leaderboard_api_url);
  const payload = {
    signup_visible: fd.get("signup_visible") === "on",
    signup_link: s("signup_link"),
    signup_new_tab: fd.get("signup_new_tab") === "on",
    signup_button_label: s("signup_button_label"),
    signup_closed: fd.get("signup_closed") === "on",
    signup_closed_text: s("signup_closed_text"),
    leaderboard_tab_visible: fd.get("leaderboard_tab_visible") === "on",
    leaderboard_api_url,
    leaderboard_personal_rank_visible: fd.get("leaderboard_personal_rank_visible") === "on",
    footer_sponsors: parseJson("footer_sponsors", []),
  };
  const { error } = await supabase.from("site_config").update(payload).eq("id", 1);
  if (error) throw error;
  revalidatePublic(["/leaderboard"]);
}
