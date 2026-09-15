import { PartnerList } from "@/components/partners/PartnerList";
import { getPartners } from "@/lib/partners/server";

export const metadata = { title: "파트너 | DO:NUTS CLASS" };

export default async function PartnersPage() {
  const partners = await getPartners();
  return <div className="space-y-8">
    <header className="border-b border-border pb-6">
      <p className="mb-2 text-xs font-semibold tracking-action text-gold">PARTNERS</p>
      <h1 className="text-display font-semibold tracking-headline sm:text-display-xl">도너츠 파트너</h1>
    </header>
    <PartnerList partners={partners} />
  </div>;
}
