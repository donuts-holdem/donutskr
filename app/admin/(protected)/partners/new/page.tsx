import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PartnerEditor } from "@/components/partners/PartnerEditor";

export const metadata = { title: "파트너 등록 | DO:NUTS CLASS" };

export default async function NewPartnerPage() {
  await requireAdmin();
  return <div className="max-w-2xl space-y-6">
    <Link href="/admin/partners" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-gold focus-visible:outline-2 focus-visible:outline-ring">파트너 목록</Link>
    <h1 className="text-2xl font-bold text-gold">파트너 등록</h1>
    <PartnerEditor />
  </div>;
}
