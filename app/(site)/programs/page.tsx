import type { Metadata } from "next";
import { getPrograms } from "@/lib/data/programs";
import { getProgramOptions } from "@/lib/data/programOptions";
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
  const [{ category }, programs, groupOptions, statusOptions] = await Promise.all([
    searchParams,
    getPrograms(),
    getProgramOptions("group"),
    getProgramOptions("status"),
  ]);

  // Category tabs: leading "전체" (all) + the admin-managed group options.
  const categories = [
    { key: "all", label: "전체" },
    ...groupOptions.map((o) => ({ key: o.value, label: o.label })),
  ];
  const statusLabels = Object.fromEntries(statusOptions.map((o) => [o.value, o.label]));

  return (
    <ProgramBoard
      programs={programs}
      initialCategory={category}
      categories={categories}
      statusLabels={statusLabels}
    />
  );
}
