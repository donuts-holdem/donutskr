"use client";

import { useState } from "react";
import type { ServedQuestion } from "@/lib/learning/types";

export function useLearningProgress(questions: ServedQuestion[]) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const question = questions[step];
  const selected = answers[question.id] ?? [];
  function choose(id: string, checked: boolean) {
    setAnswers(current => ({ ...current, [question.id]: question.answer_mode === "SINGLE" ? [id]
      : checked ? [...(current[question.id] ?? []).filter(value => value !== id), id] : (current[question.id] ?? []).filter(value => value !== id) }));
  }
  return { started, start: () => setStarted(true), step, question, selected, answers, choose,
    allAnswered: questions.length === 5 && questions.every(item => (answers[item.id]?.length ?? 0) > 0),
    previous: () => setStep(current => Math.max(0, current - 1)), next: () => setStep(current => Math.min(questions.length - 1, current + 1)) };
}
