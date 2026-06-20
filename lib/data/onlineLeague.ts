import { createServerSupabase } from "@/lib/supabase/server";
import type { OnlineLeague, LeagueStatus } from "@/lib/types";

const DEFAULT_ONLINE_LEAGUE: OnlineLeague = {
  status: "hidden",
  tab_visible: false,
  title: null,
  description: null,
  join_guide: null,
  steps: [],
  links: {},
  today_leagues: [],
  notice_text: null,
  cta_label: null,
  cta_url: null,
  sheet_url: null,
};

function mapOnlineLeague(r: any): OnlineLeague {
  return {
    status: (r.status ?? "hidden") as LeagueStatus,
    tab_visible: Boolean(r.tab_visible),
    title: r.title ?? null,
    description: r.description ?? null,
    join_guide: r.join_guide ?? null,
    steps: Array.isArray(r.steps) ? r.steps : [],
    links: r.links && typeof r.links === "object" && !Array.isArray(r.links) ? r.links : {},
    today_leagues: Array.isArray(r.today_leagues) ? r.today_leagues : [],
    notice_text: r.notice_text ?? null,
    cta_label: r.cta_label ?? null,
    cta_url: r.cta_url ?? null,
    sheet_url: r.sheet_url ?? null,
  };
}

export async function getOnlineLeague(): Promise<OnlineLeague> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("online_league")
    .select("*")
    .eq("id", 1)
    .single();
  if (error || !data) return DEFAULT_ONLINE_LEAGUE;
  return mapOnlineLeague(data);
}
