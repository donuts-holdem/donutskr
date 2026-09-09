import type { GradedAnswer } from "@/lib/learning/types";

export function answerFeedback(answer: Pick<GradedAnswer, "selected_ids" | "correct_ids" | "choices">) {
  const label = (id: string) => answer.choices.find(choice => choice.id === id)?.text ?? id;
  return {
    missing: answer.correct_ids.filter(id => !answer.selected_ids.includes(id)).map(label),
    extra: answer.selected_ids.filter(id => !answer.correct_ids.includes(id)).map(label),
    correct: answer.correct_ids.map(label),
  };
}
