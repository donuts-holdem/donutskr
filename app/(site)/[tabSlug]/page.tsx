import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSpecialPageBySlug } from "@/lib/data/specialPages";
import { getStructureWithRows } from "@/lib/data/blindStructures";
import { SpecialPageView } from "@/components/special/SpecialPageView";

type Props = { params: Promise<{ tabSlug: string }> };

// Fully dynamic: data is read through cookies()-based Supabase clients (also in the
// root layout), so this route can never be statically prerendered. Marking it
// force-dynamic avoids the SSG path that throws DYNAMIC_SERVER_USAGE at runtime.
export const dynamic = "force-dynamic";

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
      <SpecialPageView page={page} structure={structure} />
    </div>
  );
}
