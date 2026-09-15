import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PartnerManager } from "@/components/partners/PartnerManager";
import { getAdminPartners } from "@/lib/partners/server";

export const metadata = { title: "파트너 관리 | DO:NUTS CLASS" };

export default async function AdminPartnersPage() {
  const partners = await getAdminPartners();
  return <div className="max-w-4xl space-y-6">
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold text-gold">파트너</h1>
      <Button asChild className="min-h-11"><Link href="/admin/partners/new">파트너 등록</Link></Button>
    </div>
    <PartnerManager partners={partners} />
  </div>;
}
