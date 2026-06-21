import type { Metadata } from "next";
import { getProgramsByGroup } from "@/lib/data/programs";
import { ProgramList } from "@/components/program/ProgramList";

export const metadata: Metadata = {
  title: "기타 프로그램 | DO:NUTS",
  description: "DO:NUTS 기타 프로그램 목록",
};

export default async function OthersPage() {
  const programs = await getProgramsByGroup("others");

  return (
    <div className="py-8 flex flex-col gap-8">
      {/* Group hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <h1 className="text-2xl font-bold text-ink">기타 프로그램</h1>
        </div>
        <p className="text-ink/50 text-sm">
          포커와 소셜 외의 다양한 DO:NUTS 프로그램을 확인하세요.
        </p>
      </div>

      <ProgramList programs={programs} />
    </div>
  );
}
