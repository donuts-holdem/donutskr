import type { Metadata } from "next";
import { getOnlineLeague } from "@/lib/data/onlineLeague";
import { SeriesNav } from "@/components/series/SeriesNav";
import { LeagueStatusBlock } from "@/components/league/LeagueStatusBlock";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "온라인 리그 | DO:NUTS",
  description: "DO:NUTS 온라인 리그",
};

export default async function OnlineLeaguePage() {
  const league = await getOnlineLeague();

  return (
    <div className="py-8 flex flex-col gap-8">
      <SeriesNav />

      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink">온라인 리그</h1>
        <p className="text-ink/50 text-sm">DO:NUTS 온라인 포커 리그</p>
      </section>

      <LeagueStatusBlock league={league} />
    </div>
  );
}
