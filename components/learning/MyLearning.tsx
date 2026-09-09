import Link from "next/link";
import { requireActiveMember } from "@/lib/membership/server";
import { domainRpc } from "@/lib/domains/server";
import { difficultyLabels, type LearningSummary } from "@/lib/learning/types";

export async function MyLearning() {
  const { supabase } = await requireActiveMember();
  const summary = await domainRpc<LearningSummary>(supabase, "get_my_learning_summary");
  return <section className="mt-12 border-t border-border pt-8" aria-labelledby="my-learning-heading">
    <h2 id="my-learning-heading" className="text-xl font-semibold">내 학습 기록</h2>
    <dl className="mt-6 flex flex-wrap gap-8"><div><dt className="text-xs text-ink/60">학습 완료</dt><dd className="mt-2 text-2xl font-semibold">{summary.completed_days}<span className="ml-1 text-sm font-normal text-ink/60">일</span></dd></div>
      <div><dt className="text-xs text-ink/60">현재 연속 학습</dt><dd className="mt-2 text-2xl font-semibold">{summary.current_streak}<span className="ml-1 text-sm font-normal text-ink/60">일</span></dd></div>
      <div><dt className="text-xs text-ink/60">최초 제출 정답률</dt><dd className="mt-2 text-2xl font-semibold">{summary.total ? Math.round(summary.correct / summary.total * 100) + "%" : "기록 없음"}</dd><p className="mt-1 text-xs text-ink/50">{summary.correct} / {summary.total}문항</p></div>
    </dl>
    <ul className="mt-6 divide-y divide-border">{summary.difficulty.map(row => <li key={row.difficulty} className="flex justify-between gap-4 py-3 text-sm"><span>{difficultyLabels[row.difficulty]}</span><span className="text-ink/70">{row.total ? Math.round(row.correct / row.total * 100) : 0}% ({row.correct}/{row.total}문항)</span></li>)}</ul>
    <p className="mt-4 text-xs leading-relaxed text-ink/50">난이도는 문항에 부여된 기준입니다. 활동 레벨은 포커 실력 등급이 아닙니다. 운영 장애 보호일은 연속 기록만 보호하며 가짜 완료·XP를 만들지 않습니다.</p>
    <div className="mt-5 flex flex-wrap gap-6 text-sm text-gold"><Link href="/learn" className="inline-flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-gold">오늘의 학습</Link><Link href="/learn/review" className="inline-flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-gold">내 오답 {summary.wrong_count}개 복습</Link></div>
  </section>;
}
