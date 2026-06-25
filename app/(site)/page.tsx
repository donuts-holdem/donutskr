import type { Metadata } from "next";
import { getHotPrograms, getPrograms } from "@/lib/data/programs";
import { getSiteConfig } from "@/lib/data/siteConfig";
import { HomeMagazine } from "@/components/home/HomeMagazine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "DO:NUTS — 포커, 그 이상의 커뮤니티",
  description: "토너먼트부터 소셜 게임까지, 매주 새로운 판이 열리는 도너츠 포커 클럽.",
};

export default async function HomePage() {
  const [hotPrograms, programs, config] = await Promise.all([
    getHotPrograms(),
    getPrograms(),
    getSiteConfig(),
  ]);

  return (
    <HomeMagazine
      programs={programs}
      hotPrograms={hotPrograms}
      signupLink={config.signup_link}
    />
  );
}
