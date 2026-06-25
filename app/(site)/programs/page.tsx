import type { Metadata } from "next";
import { getPrograms, getAffiliatePartners } from "@/lib/data/programs";
import { ProgramDirectory } from "@/components/program/ProgramDirectory";

export const metadata: Metadata = {
  title: "프로그램 | DO:NUTS",
  description: "DO:NUTS 모든 프로그램 목록",
};

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, programs, partners] = await Promise.all([
    searchParams,
    getPrograms(),
    getAffiliatePartners(),
  ]);

  return (
    <div className="py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-1">프로그램</h1>
        <p className="text-ink/50 text-sm">DO:NUTS의 모든 프로그램을 확인하세요.</p>
      </div>

      <ProgramDirectory programs={programs} partners={partners} initialCategory={category} />
    </div>
  );
}
