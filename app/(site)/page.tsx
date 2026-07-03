import type { Metadata } from "next";
import { getEvents } from "@/lib/data/events";
import { getPrograms } from "@/lib/data/programs";
import { getProgramOptions } from "@/lib/data/programOptions";
import { getSiteConfig } from "@/lib/data/siteConfig";
import { HomeMagazine } from "@/components/home/HomeMagazine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "DO:NUTS — 포커, 그 이상의 커뮤니티",
  description: "토너먼트부터 소셜 게임까지, 매주 새로운 판이 열리는 도너츠 포커 클럽.",
};

export default async function HomePage() {
  const [events, programs, config, groupOptions, statusOptions] = await Promise.all([
    getEvents(),
    getPrograms(),
    getSiteConfig(),
    getProgramOptions("group"),
    getProgramOptions("status"),
  ]);

  const groupLabels = Object.fromEntries(groupOptions.map((o) => [o.value, o.label]));
  const statusLabels = Object.fromEntries(statusOptions.map((o) => [o.value, o.label]));

  return (
    <HomeMagazine
      events={events}
      programs={programs}
      signupLink={config.signup_link}
      groupLabels={groupLabels}
      statusLabels={statusLabels}
    />
  );
}
