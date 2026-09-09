import { answerFeedback } from "@/lib/learning/feedback";
import { difficultyLabels, type GradedAnswer } from "@/lib/learning/types";

export function AnswerReview({ answer }: { answer: GradedAnswer }) {
  const feedback = answerFeedback(answer);
  return <article className="border-b border-border py-7">
    <p className="text-xs text-ink/50">{answer.day ? answer.day + " / " : ""}{difficultyLabels[answer.difficulty]} / v{answer.version} / {answer.answer_mode === "MULTIPLE" ? "복수 정답" : "단일 정답"}</p>
    <h3 className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-relaxed">{answer.prompt}</h3>
    <p className="mt-4 text-sm font-semibold text-gold">정답: {feedback.correct.join(" / ")}</p>
    {feedback.missing.length > 0 && <p className="mt-2 text-sm text-coral-300">빠뜨린 정답: {feedback.missing.join(" / ")}</p>}
    {feedback.extra.length > 0 && <p className="mt-2 text-sm text-coral-300">잘못 추가한 선택: {feedback.extra.join(" / ")}</p>}
    {!feedback.missing.length && !feedback.extra.length && <p className="mt-2 text-sm text-gold">정확히 선택했습니다.</p>}
    <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{answer.explanation}</p>
    {answer.gto_evidence && <details className="mt-5 rounded-card border border-border p-4"><summary className="cursor-pointer py-2 text-sm text-gold focus-visible:outline-2 focus-visible:outline-gold">GTO 검증 근거와 가정</summary>
      <dl className="mt-4 space-y-4 text-sm">{[["솔버", answer.gto_evidence.solver], ["가정", answer.gto_evidence.assumptions], ["검증 근거", answer.gto_evidence.evidence], ["액션 빈도", answer.gto_evidence.frequencies]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-ink/70">{value}</dd></div>)}</dl>
    </details>}
  </article>;
}
