import Link from "next/link";
import { requireReviewer, getReviewQueue } from "@/lib/membership/server";
import { ReviewQueue } from "@/components/membership/ReviewQueue";
import { Button } from "@/components/ui/button";
import { getClassIndex } from "@/lib/classes/server";
import { getClubIndex } from "@/lib/clubs/server";

export const metadata = { title: "담당 소속 신청 승인 | DO:NUTS CLASS" };

export default async function LeaderApprovalsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const supabase = await requireReviewer();
  const [classes, clubs] = await Promise.all([getClassIndex(), getClubIndex()]);
  const parsed = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  const scope = classes.isAdmin ? undefined : { classIds: classes.classes.map(course => course.id), clubIds: clubs.clubs.map(club => club.id), excludeUserId: classes.user.id };
  const { requests, count } = await getReviewQueue(supabase, page, "PENDING", scope);
  return <section>
    <Link href="/leader" className="mb-5 inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">리더 홈</Link>
    <p className="text-xs font-semibold tracking-widest text-gold">LEADER / APPROVALS</p><h1 className="mt-4 text-3xl font-bold">담당 소속 신청 승인</h1>
    <p className="mb-8 mt-4 text-sm text-ink/70">승인 대기 {count}건</p>
    <ReviewQueue requests={requests} />
    <nav aria-label="가입 신청 페이지" className="mt-6 flex justify-between gap-3">
      {page > 1 && <Button asChild variant="outline"><Link href={`/leader/approvals?page=${page - 1}`}>이전</Link></Button>}
      {page * 50 < count && <Button asChild variant="outline"><Link href={`/leader/approvals?page=${page + 1}`}>다음</Link></Button>}
    </nav>
  </section>;
}
