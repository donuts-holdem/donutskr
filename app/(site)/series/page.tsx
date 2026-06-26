import type { Metadata } from "next";
import { getActiveSeason } from "@/lib/data/seasons";
import { getSiteConfig } from "@/lib/data/siteConfig";
import { SeriesBoard } from "@/components/series/SeriesBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "시리즈 | DO:NUTS",
  description: "DO:NUTS 포커 시리즈 — 시즌 일정과 리더보드, 온라인 리그를 한곳에서.",
};

export default async function SeriesPage() {
  const [season, config] = await Promise.all([getActiveSeason(), getSiteConfig()]);

  return (
    <SeriesBoard
      season={season}
      signupLink={config.signup_link}
      signupLabel={config.signup_button_label}
      signupNewTab={config.signup_new_tab}
    />
  );
}
