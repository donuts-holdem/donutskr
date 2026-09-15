import Link from "next/link";
import { PartnerEditor } from "@/components/partners/PartnerEditor";
import { getAdminPartner } from "@/lib/partners/server";

export const metadata = { title: "파트너 수정 | DO:NUTS CLASS" };

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await getAdminPartner(id);
  return <div className="max-w-2xl space-y-6">
    <Link href="/admin/partners" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-gold focus-visible:outline-2 focus-visible:outline-ring">파트너 목록</Link>
    <h1 className="text-2xl font-bold text-gold">파트너 수정</h1>
    <PartnerEditor key={`${partner.id}:${partner.revision}`} partner={partner} />
  </div>;
}
