import type { Metadata } from "next";
import { getPrograms } from "@/lib/data/programs";
import { ProgramBoard } from "@/components/program/ProgramBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "프로그램 | DO:NUTS",
  description: "DO:NUTS 모든 프로그램 목록",
};

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, programs] = await Promise.all([
    searchParams,
    getPrograms(),
  ]);

  return <ProgramBoard programs={programs} initialCategory={category} />;
}
