import { AffiliationCatalog } from "@/components/membership/AffiliationCatalog";

export const metadata = { title: "클럽 | DO:NUTS CLASS" };

export default function ClubPage() {
  return <AffiliationCatalog kind="CLUB" />;
}
