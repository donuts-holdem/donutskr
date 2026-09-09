import Link from "next/link";
import { getClubOverview } from "@/lib/clubs/server";

export const metadata = { title: "클럽 소개 | DO:NUTS CLASS" };
export default async function MemberClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClubOverview(id);
  return <section className="max-w-3xl space-y-8"><header className="border-b border-border pb-8"><Link href="/club" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">클럽 목록</Link><p className="mt-5 text-xs font-semibold tracking-widest text-gold">{data.club.archived_at ? "보관됨" : "CLUB"} / {data.school}</p><h1 className="mt-4 break-words text-3xl font-semibold sm:text-4xl">{data.club.name}</h1></header><p className="whitespace-pre-wrap break-words text-base leading-relaxed text-ink/70">{data.club.description || "아직 등록된 클럽 소개가 없습니다."}</p><p className="text-sm leading-relaxed text-ink/70">학교가 달라도 신청할 수 있으며 담당자가 가입 여부를 결정합니다. 다른 클럽 소속은 유지됩니다.</p>
    <div className="flex flex-wrap gap-5">{!data.club.archived_at && <Link href="/club" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">소속 신청 · 승인 상태 확인</Link>}{data.canManage && <Link href={`${data.isAdmin ? "/admin/clubs" : "/leader/club"}/${id}`} className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">담당 클럽 운영</Link>}</div>
  </section>;
}
