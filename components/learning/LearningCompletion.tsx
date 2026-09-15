import Link from "next/link";
import { AnswerReview } from "@/components/learning/AnswerReview";
import type { LearningResult } from "@/lib/learning/types";

export function LearningCompletion({ result }: { result: LearningResult }) {
  return <section className="mt-8" aria-labelledby="learning-complete-heading">
    <h2 id="learning-complete-heading" className="text-2xl font-semibold" tabIndex={-1}>오늘의 학습 완료</h2>
    <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-5 rounded-card border border-gold/30 bg-glass p-6">
      <div><dt className="text-xs text-ink/60">정답</dt><dd className="mt-2 text-2xl font-semibold">{result.correct_count}<span className="text-sm font-normal text-ink/60"> / 5</span></dd></div>
      <div><dt className="text-xs text-ink/60">획득 XP</dt><dd className="mt-2 text-2xl font-semibold text-gold">+{result.xp} XP</dd></div>
      <div><dt className="text-xs text-ink/60">연속 학습</dt><dd className="mt-2 text-2xl font-semibold">{result.current_streak}일</dd></div>
    </dl>
    <div className="mt-6 flex flex-wrap gap-6 text-sm text-gold"><Link href="/learn/review" className="inline-flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-gold">내 오답 복습</Link><Link href="/home" className="inline-flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-gold">홈으로</Link></div>
    <p className="mt-3 text-sm text-ink/60">다음 학습은 자정에 만나요.</p>
    {result.answers.length > 0 && <details className="mt-8 border-t border-border pt-5"><summary className="cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-gold">오늘의 정답과 해설</summary>
      {result.answers.map(answer => <AnswerReview key={answer.version_id} answer={answer} />)}
    </details>}
  </section>;
}
