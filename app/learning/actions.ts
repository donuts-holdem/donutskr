"use server";

import { requireAdmin } from "@/lib/auth";
import { requireActiveMember } from "@/lib/membership/server";
import { formText, requireUuid } from "@/lib/membership/validation";
import type { FormState } from "@/lib/membership/types";
import { domainRpc, actionError, refreshDomains } from "@/lib/domains/server";
import { calendarDay, confirmAction, requiredText } from "@/lib/domains/validation";

export async function saveQuestion(_: FormState, form: FormData): Promise<FormState> {
  const client = await requireAdmin();
  try {
    const id = formText(form, "question_id");
    await domainRpc(client, "save_learning_question", {
      p_question: id ? requireUuid(id) : null,
      p_payload: { prompt: requiredText(form, "prompt", 10000), choices: JSON.parse(requiredText(form, "choices", 60000)),
        answer_mode: formText(form, "answer_mode"), correct_ids: form.getAll("correct_ids").map(String),
        explanation: requiredText(form, "explanation", 12000), difficulty: formText(form, "difficulty"), kind: formText(form, "kind"),
        authorship_note: requiredText(form, "authorship_note"), authorship_confirmed: form.get("authorship_confirmed") === "on",
        ai_assisted: form.get("ai_assisted") === "on", gto_evidence: { solver: formText(form, "solver"),
          assumptions: formText(form, "assumptions"), evidence: formText(form, "evidence"), frequencies: formText(form, "frequencies") } },
    });
    refreshDomains();
    return { success: "새 초안 버전을 등록했습니다. 별도의 검수를 완료해야 게시·출제할 수 있습니다." };
  } catch (error) { return actionError(error); }
}
export async function reviewQuestion(_: FormState, form: FormData): Promise<FormState> {
  const client = await requireAdmin();
  try {
    await domainRpc(client, "review_learning_question", {
      p_version: requireUuid(formText(form, "version_id")), p_publish: formText(form, "decision") === "PUBLISHED",
      p_checks: { original: form.get("original") === "on", answer: form.get("answer") === "on",
        explanation: form.get("explanation") === "on", gto: form.get("gto") === "on" },
      p_notes: requiredText(form, "notes"),
    });
    refreshDomains();
    return { success: "검수 결과와 검수자·버전·시각을 기록했습니다." };
  } catch (error) { return actionError(error); }
}
export async function scheduleLearning(_: FormState, form: FormData): Promise<FormState> {
  const client = await requireAdmin();
  try {
    confirmAction(form);
    await domainRpc(client, "schedule_daily_learning", { p_day: calendarDay(formText(form, "day")),
      p_versions: [1, 2, 3, 4, 5].map(index => requireUuid(formText(form, "version_" + index))) });
    refreshDomains();
    return { success: "공통 데일리 5문항을 고정했습니다. 출제된 날짜와 버전은 변경되지 않습니다." };
  } catch (error) { return actionError(error); }
}
export async function protectLearningDay(_: FormState, form: FormData): Promise<FormState> {
  const client = await requireAdmin();
  try {
    confirmAction(form);
    await domainRpc(client, "protect_learning_day", { p_day: calendarDay(formText(form, "day")), p_reason: requiredText(form, "reason", 1000) });
    refreshDomains();
    return { success: "해당 날짜의 연속 학습 기록을 보호했습니다. 완료 횟수와 XP는 추가하지 않습니다." };
  } catch (error) { return actionError(error); }
}
export async function submitLearning(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireActiveMember();
  try {
    const answers: Record<string, string[]> = {};
    for (const [key, value] of form.entries()) {
      if (!key.startsWith("answer:")) continue;
      const id = requireUuid(key.slice(7));
      (answers[id] ??= []).push(String(value));
    }
    await domainRpc(supabase, "submit_daily_learning", { p_day: calendarDay(formText(form, "day")), p_answers: answers });
    refreshDomains();
    return { success: "서버 채점을 완료했습니다. 최초 제출 결과가 학습 기록과 XP에 반영됩니다." };
  } catch (error) { return actionError(error); }
}
