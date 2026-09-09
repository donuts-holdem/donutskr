import Link from "next/link";
import { requireActiveMember } from "@/lib/membership/server";
import { domainRpc } from "@/lib/domains/server";
import { difficultyLabels, type DailyLearning } from "@/lib/learning/types";
import { submitLearning } from "@/app/learning/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { AnswerReview } from "@/components/learning/AnswerReview";

export const metadata = { title: "오늘의 학습 | DO:NUTS CLASS" };
export default async function LearnPage() {
  const { supabase, profile } = await requireActiveMember();
  const daily = await domainRpc<DailyLearning>(supabase, "get_daily_learning");
  return <div className="max-w-3xl">
    <header className="border-b border-border pb-9"><p className="text-xs font-semibold tracking-widest text-gold">DAILY FIVE / {daily.day} KST</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">오늘의 다섯 번의 판단</h1>
      <p className="mt-5 text-sm leading-relaxed text-ink/70">3~5분, 검수된 다섯 문항. 모든 정회원이 같은 문제를 풉니다. 서울 기준 자정에 날짜가 바뀌며, 5문항 최초 제출 완료 시 30 XP, 모두 정답이면 10 XP를 더 받습니다.</p>
      <Link href="/learn/review" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">내 오답 복습</Link>
    </header>
    {!daily.available ? <section className="py-12"><h2 className="text-xl font-semibold">오늘의 문항을 준비 중입니다</h2><p className="mt-4 text-sm leading-relaxed text-ink/60">검수되지 않은 문제나 임의 생성 문제로 대체하지 않습니다. 운영진이 게시한 뒤 다시 방문해 주세요.</p></section> :
      daily.result ? <section className="mt-8"><h2 className="text-2xl font-semibold">오늘의 학습 완료</h2><p className="mt-3 text-sm text-gold">정답 {daily.result.correct_count}/5 · {daily.result.xp} XP</p><p className="mt-3 text-sm text-ink/60">최초 제출 결과입니다. 복습으로 정답률이나 XP가 다시 계산되지는 않습니다.</p>{daily.result.answers.map(answer => <AnswerReview key={answer.version_id} answer={answer} />)}</section> :
      <div className="mt-8">{!profile && <p className="mb-5 text-sm text-ink/60">회원 프로필이 없는 관리자는 미리보기만 가능합니다. 관리자 권한을 참여나 XP로 대신하지 않습니다.</p>}
        <ActionForm action={submitLearning} label="5문항 제출 · 서버 채점" disabled={!profile}><input type="hidden" name="day" value={daily.day} />
          {daily.questions.map((question, index) => <fieldset key={question.id} className="border-b border-border pb-8 pt-4">
            <legend className="mb-4 text-xs font-semibold tracking-widest text-gold">{String(index + 1).padStart(2, "0")} / {difficultyLabels[question.difficulty]}{question.kind === "GTO" ? " / GTO" : ""}</legend>
            <p className="whitespace-pre-wrap text-lg font-semibold leading-relaxed">{question.prompt}</p>
            {question.assumptions && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/60">{question.assumptions}</p>}
            <p className="mt-4 text-sm text-gold">{question.answer_mode === "SINGLE" ? "정답 하나를 선택하세요." : "정답을 모두 선택하세요. 빠뜨리거나 잘못 추가하면 오답입니다."}</p>
            <div className="mt-5 space-y-3">{question.choices.map(choice => <label key={choice.id} className="flex min-h-14 cursor-pointer items-start gap-4 rounded-card border border-border px-4 py-4 hover:border-gold/50 focus-within:border-gold">
              <input type={question.answer_mode === "SINGLE" ? "radio" : "checkbox"} name={"answer:" + question.id} value={choice.id} required={question.answer_mode === "SINGLE"} className="mt-1 size-4 shrink-0 accent-gold focus-visible:outline-2 focus-visible:outline-gold" /><span className="text-sm leading-relaxed">{choice.text}</span>
            </label>)}</div>
          </fieldset>)}
        </ActionForm>
      </div>}
  </div>;
}
