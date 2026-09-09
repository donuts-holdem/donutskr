import Link from "next/link";
import { requireActiveMember } from "@/lib/membership/server";
import { domainRpc } from "@/lib/domains/server";
import type { LearningSummary } from "@/lib/learning/types";
import { AnswerReview } from "@/components/learning/AnswerReview";

export const metadata = { title: "내 오답 복습 | DO:NUTS CLASS" };
export default async function WrongAnswersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireActiveMember(), params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const summary = await domainRpc<LearningSummary>(supabase, "get_my_learning_summary", { p_page: page });
  return <section className="max-w-3xl"><header className="border-b border-border pb-8"><p className="text-xs tracking-widest text-gold">MY LEARNING / REVIEW</p><h1 className="mt-4 text-3xl font-bold">다시 살펴볼 판단</h1><p className="mt-4 text-sm text-ink/60">처음 풀었던 버전의 정답과 해설을 그대로 보존합니다. 복습에는 추가 XP가 없습니다.</p><Link href="/learn" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">오늘의 학습</Link></header>
    {summary.wrong_answers.length ? summary.wrong_answers.map(answer => <AnswerReview key={answer.day + ":" + answer.version_id} answer={answer} />) : <p className="py-12 text-sm text-ink/60">기록된 오답이 없습니다.</p>}
    <nav aria-label="오답 페이지" className="mt-6 flex gap-6 text-sm text-gold">{page > 1 && <Link href={"/learn/review?page=" + (page - 1)} className="py-3 underline">이전</Link>}{page * 50 < summary.wrong_count && <Link href={"/learn/review?page=" + (page + 1)} className="py-3 underline">다음</Link>}</nav>
  </section>;
}
