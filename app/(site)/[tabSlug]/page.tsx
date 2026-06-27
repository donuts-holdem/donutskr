import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSpecialPageBySlug } from "@/lib/data/specialPages";
import { getStructureWithRows } from "@/lib/data/blindStructures";
import { SpecialPageView } from "@/components/special/SpecialPageView";
import { todayKST } from "@/lib/schedule";
import { isSpecialPagePublic } from "@/lib/visibility";

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

  // Date-window + visibility check
  if (!isSpecialPagePublic(page, todayKST())) notFound();

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
