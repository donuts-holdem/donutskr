import Link from "next/link";
import { getClubOverview } from "@/lib/clubs/server";
import { ClubLogo } from "@/components/clubs/ClubLogo";

export const metadata = { title: "클럽 소개 | DO:NUTS CLASS" };
export default async function MemberClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClubOverview(id);
  return <section className="max-w-3xl space-y-8"><header className="border-b border-border pb-8"><Link href="/club" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">클럽 목록</Link><div className="mt-5 flex items-start gap-5"><ClubLogo name={data.club.name} logoUrl={data.club.logo_url} /><div className="min-w-0"><p className="text-xs font-semibold tracking-widest text-gold">{data.club.archived_at ? "보관됨" : "CLUB"} / {data.school}</p><h1 className="mt-3 break-words text-3xl font-semibold sm:text-4xl">{data.club.name}</h1><p className="mt-4 text-sm text-ink/70">회원 {data.memberCount.toLocaleString("ko-KR")}명</p></div></div></header><p className="whitespace-pre-wrap break-words text-base leading-relaxed text-ink/70">{data.club.description || "아직 등록된 클럽 소개가 없습니다."}</p>
    <div className="flex flex-wrap gap-5"><Link href={`/meetings?club=${id}`} className="inline-flex min-h-11 items-center rounded-pill border border-gold px-5 text-sm font-semibold text-gold hover:bg-glass focus-visible:outline-2 focus-visible:outline-gold">클럽 모임 보기</Link>{!data.club.archived_at && <Link href="/club" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">소속 신청 · 승인 상태 확인</Link>}{data.canManage && <Link href={`${data.isAdmin ? "/admin/clubs" : "/leader/club"}/${id}`} className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">담당 클럽 운영</Link>}</div>
  </section>;
}
