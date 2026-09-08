import type { Metadata } from "next";
import { getActiveSeason } from "@/lib/site/data/seasons";
import { getSiteConfig } from "@/lib/site/data/siteConfig";
import { getEvents } from "@/lib/site/data/events";
import { partitionEvents } from "@/lib/site/schedule";
import { SeriesBoard } from "@/components/series/SeriesBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "시리즈 | DO:NUTS",
  description: "DO:NUTS 포커 시리즈 — 시즌 소개와 이벤트 일정, 참여 안내를 한곳에서.",
};

export default async function SeriesPage() {
  // getEvents() already scopes to the active season (filterByActiveSeason), so
  // the board here and /schedule read from the same source. We keep only the
  // live/upcoming bucket — the season landing leads with what's next, the full
  // archive lives on /schedule.
  const [season, config, events] = await Promise.all([
    getActiveSeason(),
    getSiteConfig(),
    getEvents(),
  ]);
  const { upcoming } = partitionEvents(events, new Date());

  return (
    <SeriesBoard
      season={season}
      events={upcoming}
      signupLink={config.signup_visible && !config.signup_closed ? config.signup_link : null}
      signupLabel={config.signup_button_label}
      signupNewTab={config.signup_new_tab}
    />
  );
}
