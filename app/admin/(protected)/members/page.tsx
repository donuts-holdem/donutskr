import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getReviewQueue } from "@/lib/membership/server";
import { ReviewQueue } from "@/components/membership/ReviewQueue";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus } from "@/lib/membership/types";

export const metadata = { title: "소속 신청 승인 | DO:NUTS Admin" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const supabase = await requireAdmin();
  const params = await searchParams;
  const status: ApplicationStatus = params.status === "APPROVED" || params.status === "REJECTED" ? params.status : "PENDING";
  const parsed = Number(params.page ?? "1");
  const page = Number.isInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  const { requests, count } = await getReviewQueue(supabase, page, status);
  return <div className="mx-auto max-w-5xl">
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">소속 신청 승인</h1><p className="mt-2 text-sm text-muted-foreground">클래스·클럽 신청을 각각 처리합니다. 정회원 자격은 이메일 인증으로 부여됩니다. 현재 필터 {count}건.</p></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="h-11"><Link href="/admin/members/directory">회원 관리</Link></Button><Button asChild variant="outline" className="h-11"><Link href="/admin/members/settings">초기 가입 설정</Link></Button></div>
    </header>
    <nav aria-label="소속 신청 상태" className="mb-6 flex flex-wrap gap-2">
      {([['PENDING', '승인 대기'], ['APPROVED', '승인 완료'], ['REJECTED', '반려']] as const).map(([value, label]) => <Button asChild key={value} variant={status === value ? "default" : "outline"} className="h-11"><Link href={`/admin/members?status=${value}`} aria-current={status === value ? "page" : undefined}>{label}</Link></Button>)}
    </nav>
    <ReviewQueue requests={requests} />
    <nav aria-label="소속 신청 페이지" className="mt-6 flex justify-between gap-3">
      {page > 1 && <Button asChild variant="outline"><Link href={`/admin/members?status=${status}&page=${page - 1}`}>이전</Link></Button>}
      {page * 50 < count && <Button asChild variant="outline"><Link href={`/admin/members?status=${status}&page=${page + 1}`}>다음</Link></Button>}
    </nav>
  </div>;
}
