import type { Metadata } from "next";
import { getProgramsByGroup } from "@/lib/data/programs";
import { ProgramList } from "@/components/program/ProgramList";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "포커 프로그램 | DO:NUTS",
  description: "DO:NUTS 포커 관련 프로그램 목록",
};

export default async function PokerPage() {
  const programs = await getProgramsByGroup("poker");

  return (
    <div className="py-8 flex flex-col gap-8">
      {/* Group hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">♠️</span>
          <h1 className="text-2xl font-bold text-ink">포커 프로그램</h1>
        </div>
        <p className="text-ink/50 text-sm">
          DO:NUTS의 포커 대회, 리그, 클럽 프로그램을 만나보세요.
        </p>
      </div>

      <ProgramList programs={programs} />
    </div>
  );
}
