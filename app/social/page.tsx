import type { Metadata } from "next";
import { getProgramsByGroup } from "@/lib/data/programs";
import { ProgramList } from "@/components/program/ProgramList";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "소셜 클럽 | DO:NUTS",
  description: "DO:NUTS 소셜 클럽 프로그램 목록",
};

export default async function SocialPage() {
  const programs = await getProgramsByGroup("social");

  return (
    <div className="py-8 flex flex-col gap-8">
      {/* Group hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤝</span>
          <h1 className="text-2xl font-bold text-ink">소셜 클럽</h1>
        </div>
        <p className="text-ink/50 text-sm">
          다양한 소셜 활동과 커뮤니티 프로그램에 참여해보세요.
        </p>
      </div>

      <ProgramList programs={programs} />
    </div>
  );
}
