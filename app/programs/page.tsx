import type { Metadata } from "next";
import { getPrograms, getAffiliatePartners } from "@/lib/data/programs";
import { ProgramList } from "@/components/program/ProgramList";
import { PartnerList } from "@/components/program/PartnerList";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "프로그램 | DO:NUTS",
  description: "DO:NUTS 모든 프로그램 목록",
};

export default async function ProgramsPage() {
  const [programs, partners] = await Promise.all([
    getPrograms(),
    getAffiliatePartners(),
  ]);

  return (
    <div className="py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-1">프로그램</h1>
        <p className="text-ink/50 text-sm">DO:NUTS의 모든 프로그램을 확인하세요.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main list */}
        <div className="flex-1 min-w-0">
          <ProgramList programs={programs} />
        </div>

        {/* Partners sidebar */}
        {partners.length > 0 && (
          <div className="w-full lg:w-56 shrink-0">
            <PartnerList partners={partners} />
          </div>
        )}
      </div>
    </div>
  );
}
