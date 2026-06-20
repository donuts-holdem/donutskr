import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSpecialPageBySlug } from "@/lib/data/specialPages";
import { getStructureWithRows } from "@/lib/data/blindStructures";
import { SeriesNav } from "@/components/series/SeriesNav";
import { SpecialPageView } from "@/components/special/SpecialPageView";

export const revalidate = 300;

type Props = { params: Promise<{ tabSlug: string }> };

// generateStaticParams cannot call cookies()-based data functions in Next 16
// — use on-demand ISR instead (dynamicParams=true by default).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tabSlug } = await params;
  const page = await getSpecialPageBySlug(tabSlug).catch(() => null);
  return { title: page?.title ?? "DO:NUTS" };
}

export default async function SpecialPage({ params }: Props) {
  const { tabSlug } = await params;

  const page = await getSpecialPageBySlug(tabSlug).catch(() => null);
  if (!page) notFound();

  // Date-window check
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  if (page.start_show_date && today < page.start_show_date) notFound();
  if (page.end_show_date && today > page.end_show_date) notFound();

  // Fetch blind structure if linked
  const structure = page.blind_structure_id
    ? await getStructureWithRows(page.blind_structure_id).catch(() => null)
    : null;

  return (
    <div className="py-8 flex flex-col gap-8">
      <SeriesNav />
      <SpecialPageView page={page} structure={structure} />
    </div>
  );
}
