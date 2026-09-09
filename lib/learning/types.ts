export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type AnswerMode = "SINGLE" | "MULTIPLE";
export interface LearningChoice { id: string; text: string }
export interface GtoEvidence { solver: string; assumptions: string; evidence: string; frequencies: string }
export interface LearningVersion {
  id: string; question_id: string; version: number; prompt: string; choices: LearningChoice[];
  answer_mode: AnswerMode; correct_ids: string[]; explanation: string; difficulty: Difficulty;
  kind: "GENERAL" | "GTO"; authorship_note: string; ai_assisted: boolean; gto_evidence: GtoEvidence | null;
  status: "DRAFT" | "PUBLISHED" | "REJECTED"; authored_by: string; created_at: string;
  reviewed_by: string | null; reviewed_at: string | null;
}
export interface ServedQuestion {
  id: string; prompt: string; choices: LearningChoice[]; answer_mode: AnswerMode;
  difficulty: Difficulty; kind: "GENERAL" | "GTO"; assumptions: string | null;
}
export interface GradedAnswer {
  version_id: string; question_id?: string; version: number; prompt: string; choices: LearningChoice[];
  answer_mode: AnswerMode; difficulty: Difficulty; selected_ids: string[]; correct_ids: string[];
  correct?: boolean; explanation: string; gto_evidence: GtoEvidence | null; day?: string;
}
export interface LearningResult { id: string; day: string; correct_count: number; xp: number; answers: GradedAnswer[] }
export interface DailyLearning { day: string; available: boolean; questions: ServedQuestion[]; result: LearningResult | null }
export interface LearningSummary {
  completed_days: number; current_streak: number; total: number; correct: number;
  difficulty: { difficulty: Difficulty; total: number; correct: number }[];
  wrong_answers: GradedAnswer[]; wrong_count: number;
}
export const difficultyLabels: Record<Difficulty, string> = { BEGINNER: "입문", INTERMEDIATE: "중급", ADVANCED: "고급" };
