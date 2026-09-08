import Link from "next/link";
import { requireReviewer, getReviewQueue } from "@/lib/membership/server";
import { ReviewQueue } from "@/components/membership/ReviewQueue";
import { Button } from "@/components/ui/button";

export const metadata = { title: "담당 소속 가입 승인 | DO:NUTS CLASS" };

export default async function LeaderApprovalsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const supabase = await requireReviewer();
  const parsed = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  const { requests, count } = await getReviewQueue(supabase, page);
  return <section>
    <p className="text-xs font-semibold tracking-widest text-gold">LEADER / APPROVALS</p><h1 className="mt-4 text-3xl font-bold">담당 소속 가입 승인</h1>
    <p className="mb-8 mt-4 text-sm leading-relaxed text-ink/60">담당 클래스 또는 동아리로 신청한 회원만 표시됩니다. 승인 대기 {count}명.</p>
    <ReviewQueue requests={requests} />
    <nav aria-label="가입 신청 페이지" className="mt-6 flex justify-between gap-3">
      {page > 1 && <Button asChild variant="outline"><Link href={`/leader/approvals?page=${page - 1}`}>이전</Link></Button>}
      {page * 50 < count && <Button asChild variant="outline"><Link href={`/leader/approvals?page=${page + 1}`}>다음</Link></Button>}
    </nav>
  </section>;
}
