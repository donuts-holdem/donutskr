"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { submitLearning } from "@/app/learning/actions";
import { difficultyLabels, type DailyLearning } from "@/lib/learning/types";
import { useLearningProgress } from "@/lib/learning/use-learning-progress";
import { PokerSpot } from "@/components/learning/PokerSpot";
import { LearningCompletion } from "@/components/learning/LearningCompletion";

const primary = "inline-flex min-h-12 items-center justify-center rounded-pill bg-gold px-6 text-sm font-semibold text-bg hover:bg-gold/90 active:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40";
const secondary = "inline-flex min-h-12 items-center justify-center rounded-pill border border-border px-5 text-sm font-semibold hover:border-gold/60 active:bg-glass focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40";

export function DailyLearningFlow({ daily, canParticipate }: { daily: DailyLearning; canParticipate: boolean }) {
  const progress = useLearningProgress(daily.questions);
  const [state, submit, pending] = useActionState(submitLearning, {});
  const heading = useRef<HTMLHeadingElement>(null);
  const result = state.result ?? daily.result;
  useEffect(() => {
    if (result) document.getElementById("learning-complete-heading")?.focus();
    else if (progress.started) heading.current?.focus();
  }, [progress.step, progress.started, result]);
  if (result) return <LearningCompletion result={result} />;
  if (!progress.started) return <section className="mt-8 rounded-card border border-border bg-glass p-6 sm:p-8">
    <p className="text-xl font-semibold">5문항 · 3~5분</p>
    <p className="mt-3 text-sm text-gold">완료 +30 XP · 모두 정답 +10 XP</p>
    {!canParticipate && <p className="mt-4 text-sm text-ink/60">학습 참여에는 회원 프로필이 필요합니다.</p>}
    <button type="button" onClick={progress.start} disabled={!canParticipate} className={primary + " mt-7 w-full sm:w-auto"}>학습 시작</button>
  </section>;
  const { question } = progress;
  return <form action={submit} aria-busy={pending} className="mt-7" onSubmit={event => {
    event.preventDefault();
    if (pending || !canParticipate || !progress.allAnswered || progress.step !== 4) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => submit(data));
  }}>
    <input type="hidden" name="day" value={daily.day} />
    {daily.questions.flatMap(item => (progress.answers[item.id] ?? []).map(id => <input key={item.id + ":" + id} type="hidden" name={"answer:" + item.id} value={id} />))}
    <div className="flex items-baseline justify-between gap-4"><p aria-live="polite" className="font-mono text-sm text-gold">{progress.step + 1} / 5</p><p className="text-xs text-ink/60">{difficultyLabels[question.difficulty]}{question.kind === "GTO" ? " · GTO" : ""}</p></div>
    <progress aria-label="학습 진행" value={progress.step + 1} max={5} className="mt-3 h-1 w-full progress-gold" />
    <h2 ref={heading} tabIndex={-1} id="learning-question" className="mt-7 whitespace-pre-wrap break-words text-xl font-semibold leading-relaxed focus-visible:outline-2 focus-visible:outline-gold">{question.prompt}</h2>
    <PokerSpot spot={question.spot} />
    {question.assumptions && <p className="mt-5 whitespace-pre-wrap break-words border-l-2 border-gold/40 pl-4 text-sm leading-relaxed text-ink/70">{question.assumptions}</p>}
    <fieldset disabled={pending} aria-labelledby="learning-question" aria-describedby="learning-answer-mode" className="mt-6 space-y-3">
      <legend id="learning-answer-mode" className="mb-4 text-sm text-gold">{question.answer_mode === "SINGLE" ? "정답 하나를 선택하세요." : "정답을 모두 선택하세요. 빠뜨리거나 더 선택하면 오답입니다."}</legend>
      {question.choices.map(choice => <label key={question.id + ":" + choice.id} className={"flex min-h-14 cursor-pointer items-start gap-4 rounded-card border px-4 py-4 transition-colors hover:border-gold/60 focus-within:outline-2 focus-within:outline-gold " + (progress.selected.includes(choice.id) ? "border-gold bg-gold/10" : "border-border")}>
        <input type={question.answer_mode === "SINGLE" ? "radio" : "checkbox"} name={"choice:" + question.id} value={choice.id} checked={progress.selected.includes(choice.id)} onChange={event => progress.choose(choice.id, event.target.checked)} className="mt-1 size-4 shrink-0 accent-gold focus-visible:outline-2 focus-visible:outline-gold" />
        <span className="break-words text-sm leading-relaxed">{choice.text}</span>
      </label>)}
    </fieldset>
    {state.error && <p role="alert" className="mt-5 text-sm text-coral-to">{state.error}</p>}
    <div className="mt-7 flex gap-3"><button type="button" onClick={progress.previous} disabled={progress.step === 0 || pending} className={secondary}>이전 문항</button>
      {progress.step < 4 ? <button type="button" onClick={progress.next} disabled={!progress.selected.length || pending} className={primary + " flex-1"}>다음 문항</button>
        : <button type="submit" disabled={!progress.allAnswered || !canParticipate || pending} className={primary + " flex-1"}>{pending ? "제출 중..." : "답안 제출"}</button>}
    </div>
  </form>;
}
